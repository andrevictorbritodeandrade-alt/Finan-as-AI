import React, { useEffect, useState, useMemo, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SummaryCard from './components/SummaryCard';
import TransactionList from './components/TransactionList';
import AiChat from './components/AiChat';
import { MonthData, TransactionType, Transaction, FinancialProjection } from './types';
import { generateMonthData, getStorageKey } from './utils/financeUtils';
import { db, auth, isConfigured, onAuthStateChanged, signInAnonymously } from './services/firebaseConfig';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { FAMILY_ID } from './constants';
import { Target, Plus, ShoppingBag, User, Plane, Wallet, PiggyBank, Home as HomeIcon } from 'lucide-react';

const App: React.FC = () => {
    // App State
    const [currentMonth, setCurrentMonth] = useState(2); // Inicia em Fevereiro
    const [currentYear, setCurrentYear] = useState(2026);
    const [monthData, setMonthData] = useState<MonthData | null>(null);
    const [view, setView] = useState<'home' | 'transactions' | 'goals'>('home');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [aiOpen, setAiOpen] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'offline' | 'syncing' | 'online'>('offline');
    const [transactionListType, setTransactionListType] = useState<TransactionType>('expenses');

    // Added state for pre-filling AI message
    const [aiInitialMessage, setAiInitialMessage] = useState<string>('');

    // Ref for accessing latest data in closures/listeners (Critical for robust syncing)
    const monthDataRef = useRef<MonthData | null>(null);
    useEffect(() => { monthDataRef.current = monthData; }, [monthData]);

    // Load Initial Data
    useEffect(() => {
        loadData(currentYear, currentMonth);
        
        // Auth Setup
        if (isConfigured && auth) {
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    setSyncStatus('online');
                    setupRealtimeListener(currentYear, currentMonth);
                } else {
                    signInAnonymously(auth).catch((e) => {
                        // Handle specific API not enabled error gracefully
                        if (e.message && e.message.includes('identity-toolkit-api-has-not-been-used')) {
                            console.warn("Firebase Auth API not enabled. Running in Offline Mode.");
                        } else {
                            console.error("Auth Error", e);
                        }
                        setSyncStatus('offline');
                    });
                }
            });
        }
    }, []);

    const loadData = async (year: number, month: number) => {
        const key = getStorageKey(year, month);
        const local = localStorage.getItem(key);
        if (local) {
            setMonthData(JSON.parse(local));
        } else {
            const newData = generateMonthData(year, month);
            setMonthData(newData);
            saveData(newData, year, month);
        }
    };

    const saveData = async (data: MonthData, year: number, month: number) => {
        const key = getStorageKey(year, month);
        localStorage.setItem(key, JSON.stringify(data));
        setMonthData({ ...data }); // Force update

        if (syncStatus === 'online' && isConfigured) {
            setSyncStatus('syncing');
            try {
                const docRef = doc(db, 'families', FAMILY_ID, 'months', `${year}-${month.toString().padStart(2, '0')}`);
                await setDoc(docRef, data);
                setSyncStatus('online');
            } catch (e) {
                console.error("Sync failed", e);
                setSyncStatus('offline');
            }
        }
    };

    const setupRealtimeListener = (year: number, month: number) => {
        if (!isConfigured) return;
        const docRef = doc(db, 'families', FAMILY_ID, 'months', `${year}-${month.toString().padStart(2, '0')}`);
        return onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const cloudData = snap.data() as MonthData;
                const localKey = getStorageKey(year, month);
                const localStr = localStorage.getItem(localKey);
                
                // Simple conflict resolution: Cloud wins if newer or local is missing
                if (!localStr || cloudData.updatedAt > JSON.parse(localStr).updatedAt) {
                    setMonthData(cloudData);
                    localStorage.setItem(localKey, JSON.stringify(cloudData));
                }
            } else {
                // Cloud document doesn't exist. 
                // If we have local data (e.g. generated template), upload it now that we are online.
                if (monthDataRef.current) {
                    setDoc(docRef, monthDataRef.current).catch(e => console.error("Initial upload failed", e));
                }
            }
        });
    };

    const handleMonthChange = (diff: number) => {
        let newMonth = currentMonth + diff;
        let newYear = currentYear;
        if (newMonth > 12) { newMonth = 1; newYear++; }
        if (newMonth < 1) { newMonth = 12; newYear--; }
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
        loadData(newYear, newMonth);
    };

    const handleTogglePaid = (id: string, paid: boolean, type: TransactionType) => {
        if (!monthData) return;
        const newData = { ...monthData };
        const item = newData[type].find(t => t.id === id);
        if (item) {
            item.paid = paid;
            item.updatedAt = Date.now(); // Internal flag not in interface but useful
            saveData(newData, currentYear, currentMonth);
        }
    };

    const handleToggleGroupPaid = (items: Transaction[]) => {
        if (!monthData) return;
        // Check if all are currently paid to decide whether to uncheck or check all
        const allPaid = items.every(i => i.paid);
        const newStatus = !allPaid;

        const newData = { ...monthData };
        items.forEach(groupItem => {
            const target = newData.expenses.find(e => e.id === groupItem.id);
            if (target) {
                target.paid = newStatus;
            }
        });
        newData.updatedAt = Date.now();
        saveData(newData, currentYear, currentMonth);
    };

    // Open AI with specific context
    const openAiWithContext = (message: string) => {
        setAiInitialMessage(message);
        setAiOpen(true);
    };

    // --- Calculations ---
    const stats = useMemo(() => {
        if (!monthData) return { 
            salary: { total: 0, paid: 0 }, 
            realExpenses: { total: 0, paid: 0 },
            distribution: { total: 0, paid: 0 },
            mumbuca: { total: 0, paid: 0, expenses: 0, expensesPaid: 0 },
            combined: { total: 0, paid: 0 },
            surplusRaw: 0
        };

        const calc = (items: Transaction[], paidOnly = false) => 
            items.filter(i => paidOnly ? i.paid : true).reduce((sum, i) => sum + i.amount, 0);

        // Split expenses into Real vs Distribution
        const realExpensesList = monthData.expenses.filter(e => !e.isDistribution);
        const distributionList = monthData.expenses.filter(e => e.isDistribution);

        // Salary Logic: Category 'Salário', 'Doação', 'Renda Extra'
        const salaryItems = monthData.incomes.filter(i => ['Salário', 'Doação', 'Renda Extra'].includes(i.category));
        
        // Mumbuca Logic
        const mumbucaItems = monthData.incomes.filter(i => i.category === 'Mumbuca');

        const salaryTotal = calc(salaryItems);
        const salaryPaid = calc(salaryItems, true);

        const mumbucaTotalRaw = calc(mumbucaItems);
        const mumbucaPaidRaw = calc(mumbucaItems, true);

        // Mumbuca Net (Minus 8% fee)
        const mumbucaNetTotal = mumbucaTotalRaw * 0.92;
        const mumbucaNetPaid = mumbucaPaidRaw * 0.92;

        const combinedTotal = salaryTotal + mumbucaNetTotal;

        // Stats for Real Expenses (excluding allocation/distribution)
        const realExpensesTotal = calc(realExpensesList);
        const realExpensesPaid = calc(realExpensesList, true);

        // Stats for Distribution
        const distributionTotal = calc(distributionList);
        const distributionPaid = calc(distributionList, true);
        
        return {
            salary: {
                total: salaryTotal,
                paid: salaryPaid
            },
            realExpenses: {
                total: realExpensesTotal,
                paid: realExpensesPaid
            },
            distribution: {
                total: distributionTotal,
                paid: distributionPaid
            },
            mumbuca: {
                total: mumbucaTotalRaw,
                paid: mumbucaPaidRaw,
                expenses: calc(monthData.shoppingItems),
                expensesPaid: calc(monthData.shoppingItems, true)
            },
            combined: {
                total: combinedTotal,
                paid: salaryPaid + mumbucaNetPaid
            },
            surplusRaw: combinedTotal - realExpensesTotal
        };
    }, [monthData]);

    // Financial Projections Logic
    const projections: FinancialProjection[] = useMemo(() => {
        if(!monthData) return [];
        return [{
            month: 'Atual',
            year: currentYear,
            fixedIncome: stats.salary.total,
            recurringExpenses: monthData.expenses.filter(e => !e.installments && !e.isDistribution).reduce((s, e) => s + e.amount, 0),
            committedInstallments: monthData.expenses.filter(e => e.installments && !e.isDistribution).reduce((s, e) => s + e.amount, 0),
            totalCommitted: stats.realExpenses.total,
            margin: stats.salary.total - stats.realExpenses.total,
            details: monthData.expenses.filter(e => !e.isDistribution).map(e => `${e.description}: ${e.amount}`)
        }];
    }, [monthData, stats, currentYear]);

    // Calculate Accounts for Sidebar dynamically
    const sidebarAccounts = useMemo(() => {
        return [
            { 
                id: 'acc_main', 
                name: 'Conta Principal', 
                balance: stats.salary.total // Junção dos Salários
            },
            { 
                id: 'acc_mum', 
                name: 'Mumbuca', 
                balance: stats.mumbuca.total * 0.92 // Junção dos Mumbucas com 8% de desconto
            }
        ];
    }, [stats]);

    // Group Personal Debts
    const groupedDebts = useMemo(() => {
        if (!monthData) return [];
        const targets = ['Lili Torres', 'Marcia Brito', 'Marcia Bispo', 'Rebecca Brito'];
        
        // Map to store groups
        const groups: Record<string, { 
            name: string, 
            total: number, 
            paidAmount: number, 
            items: Transaction[] 
        }> = {};

        monthData.expenses.forEach(e => {
            // Find if this expense belongs to a target person
            const personName = targets.find(t => e.description.toLowerCase().includes(t.toLowerCase()));
            
            if (personName) {
                if (!groups[personName]) {
                    groups[personName] = { 
                        name: personName, 
                        total: 0, 
                        paidAmount: 0, 
                        items: [] 
                    };
                }
                groups[personName].items.push(e);
                groups[personName].total += e.amount;
                if (e.paid) {
                    groups[personName].paidAmount += e.amount;
                }
            }
        });

        return Object.values(groups);
    }, [monthData]);

    const getDebtColor = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('lili')) return 'from-pink-500 to-rose-600 shadow-pink-200';
        if (n.includes('marcia brito')) return 'from-violet-500 to-purple-600 shadow-violet-200';
        if (n.includes('marcia bispo')) return 'from-blue-500 to-cyan-600 shadow-blue-200';
        if (n.includes('rebecca')) return 'from-amber-400 to-orange-500 shadow-orange-200';
        return 'from-gray-500 to-gray-700';
    };

    // Balance for Header: Using PROJECTED SURPLUS (Total Income - Total Expenses) 
    // This avoids negative balance confusion when income hasn't been ticked as paid yet.
    // Logic: Combined Income (Salary + Mumbuca Net) - Real Expenses (Excluding Distribution)
    const balance = stats.surplusRaw;

    if (!monthData) return <div className="flex items-center justify-center h-screen bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div></div>;

    const getTabStyle = (type: TransactionType) => {
        if (transactionListType !== type) return 'text-gray-400 hover:text-gray-600 hover:bg-gray-50';
        
        switch(type) {
            case 'incomes': return 'bg-emerald-50 text-emerald-700 shadow-sm';
            case 'expenses': return 'bg-rose-50 text-rose-700 shadow-sm';
            case 'avulsosItems': return 'bg-amber-50 text-amber-700 shadow-sm';
            default: return 'bg-teal-50 text-teal-700 shadow-sm';
        }
    };

    return (
        <div className="flex flex-col h-screen w-full bg-gray-50">
            <Header 
                month={currentMonth} 
                year={currentYear} 
                balance={balance}
                onMonthChange={handleMonthChange}
                onToggleSidebar={() => setSidebarOpen(true)}
                onOpenAi={() => setAiOpen(true)}
                onSync={() => saveData(monthData, currentYear, currentMonth)}
                syncStatus={syncStatus}
            />

            <Sidebar 
                isOpen={sidebarOpen} 
                onClose={() => setSidebarOpen(false)} 
                accounts={sidebarAccounts} // Pass dynamically calculated accounts
                syncStatus={syncStatus}
                onSync={() => saveData(monthData, currentYear, currentMonth)}
                currentView={view}
                onNavigate={setView}
            />

            <AiChat 
                isOpen={aiOpen} 
                onClose={() => setAiOpen(false)} 
                currentMonthData={monthData}
                projections={projections}
                initialMessage={aiInitialMessage}
            />

            {/* Adjusted padding bottom since nav bar is gone */}
            <main className="flex-1 overflow-y-auto p-4 pb-6 scroll-smooth">
                {view === 'home' && (
                    <div className="flex flex-col gap-6 animate-fadeIn">
                        {/* Grid de Resumo */}
                        <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-3">
                                <SummaryCard 
                                    title="Entradas (Salário)"
                                    value={stats.salary.total}
                                    type="success"
                                    progress={{ value: stats.salary.paid, max: stats.salary.total || 1 }}
                                    compact={true}
                                />
                                <SummaryCard 
                                    title="Entradas (Sal. + Mumbuca)"
                                    subtitle="-8% taxa de troca"
                                    value={stats.combined.total}
                                    type="info"
                                    progress={{ value: stats.combined.paid, max: stats.combined.total || 1 }}
                                    compact={true}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <SummaryCard 
                                    title="Despesas Totais"
                                    value={stats.realExpenses.total}
                                    type="danger"
                                    progress={{ value: stats.realExpenses.paid, max: stats.realExpenses.total || 1 }}
                                    compact={true}
                                />
                                <SummaryCard 
                                    title="Sobras (Previsto)"
                                    // Shows Total Surplus minus what was already allocated/paid
                                    value={stats.surplusRaw - stats.distribution.paid}
                                    type="final"
                                    subtitle="Restante para distribuir"
                                    compact={true}
                                />
                            </div>
                        </div>

                        {/* PERSONAL DEBTS CARDS (GROUPED) */}
                        {groupedDebts.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <h3 className="text-base font-extrabold text-gray-800 px-1">Compromissos Pessoais</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {groupedDebts.map(group => {
                                        const colorClass = getDebtColor(group.name);
                                        const isFullyPaid = group.paidAmount >= group.total && group.total > 0;
                                        const percentage = (group.paidAmount / (group.total || 1)) * 100;
                                        
                                        return (
                                            <div 
                                                key={group.name} 
                                                onClick={() => handleToggleGroupPaid(group.items)}
                                                className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${colorClass} text-white shadow-lg active:scale-95 transition-all cursor-pointer`}
                                            >
                                                {/* Background pattern */}
                                                <div className="absolute top-0 right-0 p-2 opacity-20">
                                                    <User size={40} />
                                                </div>
                                                
                                                <div className="flex flex-col gap-1 relative z-10">
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-xs font-bold uppercase tracking-wider opacity-90">{group.name}</span>
                                                        {isFullyPaid && <div className="bg-white/30 rounded-full p-0.5"><div className="w-1.5 h-1.5 bg-white rounded-full"></div></div>}
                                                    </div>
                                                    
                                                    <span className={`text-2xl font-black tracking-tight ${isFullyPaid ? 'line-through opacity-70' : ''}`}>
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(group.total)}
                                                    </span>
                                                    
                                                    {/* Progress Bar for the group */}
                                                    <div className="mt-2 w-full bg-black/20 rounded-full h-1.5 overflow-hidden flex">
                                                        <div 
                                                            className="h-full bg-white/90 rounded-full transition-all duration-500" 
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                    </div>
                                                    
                                                    <div className="flex justify-between items-center mt-1 opacity-80">
                                                        <span className="text-[10px] font-bold">
                                                            {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
                                                        </span>
                                                        <span className="text-[10px] font-bold">
                                                            {Math.round(percentage)}% pago
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {view === 'transactions' && (
                    <div className="flex flex-col gap-4 animate-fadeIn">
                        <div className="sticky top-0 z-20 bg-gray-50 pb-2">
                            <div className="flex p-1 bg-white border border-gray-200 rounded-xl shadow-sm">
                                {(['incomes', 'expenses', 'avulsosItems'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setTransactionListType(type)}
                                        className={`flex-1 py-3 px-2 rounded-lg text-sm font-extrabold uppercase tracking-wide transition-all ${getTabStyle(type)}`}
                                    >
                                        {type === 'incomes' ? 'Entradas' : 
                                         type === 'expenses' ? 'Despesas' :
                                         'Avulsos'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <TransactionList 
                            transactions={monthData[transactionListType]}
                            onTogglePaid={(id, paid) => handleTogglePaid(id, paid, transactionListType)}
                            onEdit={(item) => console.log("Edit", item)}
                        />
                    </div>
                )}

                {view === 'goals' && (
                    <div className="flex flex-col animate-fadeIn gap-4">
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg shadow-indigo-600/20">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <Target size={24} />
                                </div>
                                <h3 className="text-xl font-black">Distribuição de Sobras</h3>
                            </div>
                            <p className="text-indigo-50 text-sm font-medium leading-relaxed">
                                Acompanhe quanto você já separou para cada objetivo este mês. Marque como "Pago" no extrato para encher as barras.
                            </p>
                        </div>

                        {monthData.goals.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 font-medium">
                                Nenhuma meta de distribuição configurada para este mês.
                                {currentYear === 2026 && currentMonth < 3 && <span className="block text-xs mt-1">(Disponível a partir de Março/2026)</span>}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {monthData.goals.map(goal => {
                                    // Find Linked Transaction to see if it is paid
                                    const linkedTransaction = monthData.expenses.find(t => t.id === goal.linkedTransactionId);
                                    const isPaid = linkedTransaction?.paid || false;
                                    const currentAmount = isPaid ? goal.amount : 0;
                                    const percentage = (currentAmount / goal.amount) * 100;
                                    
                                    // Visual Config based on Category
                                    const getConfig = (cat: string) => {
                                        if (cat.includes('Lazer') || goal.name?.includes('Viagem')) return { bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-900', bar: 'bg-sky-500', icon: Plane };
                                        if (cat.includes('Investimento')) return { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-900', bar: 'bg-emerald-500', icon: PiggyBank };
                                        if (cat.includes('Alimentação') || goal.name?.includes('Casa')) return { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-900', bar: 'bg-amber-500', icon: ShoppingBag };
                                        return { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-900', bar: 'bg-purple-500', icon: Wallet };
                                    };

                                    const s = getConfig(goal.category);
                                    const Icon = s.icon;

                                    return (
                                        <div key={goal.id} className={`p-5 rounded-2xl border ${s.border} ${s.bg} shadow-sm flex flex-col gap-4 transition-all`}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center ${s.text} shadow-sm`}>
                                                        <Icon size={20} strokeWidth={2.5} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className={`font-bold text-sm ${s.text}`}>{goal.name}</span>
                                                        <span className="text-xs font-bold opacity-60 uppercase">{isPaid ? 'Valor em Caixa' : 'Aguardando Depósito'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col gap-1">
                                                <div className="flex justify-between items-end mb-1">
                                                    <span className={`text-2xl font-black ${s.text}`}>
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentAmount)}
                                                    </span>
                                                    <span className={`text-xs font-bold ${s.text} opacity-70`}>
                                                        Meta: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.amount)}
                                                    </span>
                                                </div>
                                                <div className="h-3 w-full bg-white rounded-full overflow-hidden shadow-inner">
                                                    <div className={`h-full rounded-full transition-all duration-500 ${s.bar}`} style={{ width: `${percentage}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Floating Action Button - Adjusted Position since Nav is gone */}
            <button className="fixed bottom-6 right-5 w-16 h-16 bg-gray-900 text-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.3)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-30">
                <Plus size={32} strokeWidth={3} />
            </button>
        </div>
    );
};

export default App;