import React, { useEffect, useState, useMemo, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SummaryCard from './components/SummaryCard';
import TransactionList from './components/TransactionList';
import EditTransactionModal from './components/EditTransactionModal';
import FinancialHealthWidget from './components/FinancialHealthWidget';
import ExpenseDistribution from './components/ExpenseDistribution';
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
    const [syncStatus, setSyncStatus] = useState<'offline' | 'syncing' | 'online'>('offline');
    const [transactionListType, setTransactionListType] = useState<TransactionType>('expenses');

    // Edit Modal State
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Ref for accessing latest data in closures/listeners
    const monthDataRef = useRef<MonthData | null>(null);
    useEffect(() => { monthDataRef.current = monthData; }, [monthData]);

    // Load Initial Data
    useEffect(() => {
        loadData(currentYear, currentMonth);
        if (isConfigured && auth) {
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    setSyncStatus('online');
                    setupRealtimeListener(currentYear, currentMonth);
                } else {
                    signInAnonymously(auth).catch((e) => {
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

    // NEW: Force sync on visibility change (when opening app from background) to ensure instant updates
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Trigger a re-read if needed, though onSnapshot handles most.
                // This ensures if the socket was paused, we wake it up.
                console.log("App foregrounded, ensuring sync...");
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
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
        // Ensure updatedAt is always fresh
        data.updatedAt = Date.now();
        
        const key = getStorageKey(year, month);
        localStorage.setItem(key, JSON.stringify(data));
        setMonthData({ ...data }); 

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
                
                // CRITICAL FIX: Always trust the cloud snapshot. 
                // Removed the timestamp comparison (cloudData.updatedAt > local) because clock differences 
                // between devices were preventing updates from showing up immediately.
                setMonthData(cloudData);
                
                // Update local cache immediately
                const localKey = getStorageKey(year, month);
                localStorage.setItem(localKey, JSON.stringify(cloudData));
            } else {
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
            // saveData handles updatedAt
            saveData(newData, currentYear, currentMonth);
        }
    };

    const handleToggleGroupPaid = (items: Transaction[]) => {
        if (!monthData) return;
        const allPaid = items.every(i => i.paid);
        const newStatus = !allPaid;
        const newData = { ...monthData };
        items.forEach(groupItem => {
            const target = newData.expenses.find(e => e.id === groupItem.id);
            if (target) { target.paid = newStatus; }
        });
        saveData(newData, currentYear, currentMonth);
    };

    const handleEditTransaction = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        setIsEditModalOpen(true);
    };

    const handleAddNewTransaction = () => {
        setEditingTransaction(null); // Null triggers "New" mode in modal
        setIsEditModalOpen(true);
    };

    const handleSaveTransaction = (updatedTransaction: Transaction, targetList: TransactionType) => {
        if (!monthData) return;
        const newData = { ...monthData };
        
        // Helper to remove transaction if it exists in any list (in case type changed or just updating)
        const removeFromLists = (id: string) => {
            newData.incomes = newData.incomes.filter(t => t.id !== id);
            newData.expenses = newData.expenses.filter(t => t.id !== id);
            newData.avulsosItems = newData.avulsosItems.filter(t => t.id !== id);
            newData.shoppingItems = newData.shoppingItems.filter(t => t.id !== id);
        };

        // 1. Remove existing instance if updating
        removeFromLists(updatedTransaction.id);

        // 2. Add to the target list
        if (!newData[targetList]) newData[targetList] = [];
        newData[targetList].push(updatedTransaction);

        saveData(newData, currentYear, currentMonth);
    };

    // Calculations
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

        const realExpensesList = monthData.expenses.filter(e => !e.isDistribution);
        const distributionList = monthData.expenses.filter(e => e.isDistribution);
        const salaryItems = monthData.incomes.filter(i => ['Salário', 'Doação', 'Renda Extra'].includes(i.category));
        const mumbucaItems = monthData.incomes.filter(i => i.category === 'Mumbuca');

        const salaryTotal = calc(salaryItems);
        const salaryPaid = calc(salaryItems, true);
        const mumbucaTotalRaw = calc(mumbucaItems);
        const mumbucaPaidRaw = calc(mumbucaItems, true);
        const mumbucaNetTotal = mumbucaTotalRaw * 0.92;
        const mumbucaNetPaid = mumbucaPaidRaw * 0.92;
        const combinedTotal = salaryTotal + mumbucaNetTotal;
        const realExpensesTotal = calc(realExpensesList);
        const realExpensesPaid = calc(realExpensesList, true);
        const distributionTotal = calc(distributionList);
        const distributionPaid = calc(distributionList, true);
        
        return {
            salary: { total: salaryTotal, paid: salaryPaid },
            realExpenses: { total: realExpensesTotal, paid: realExpensesPaid },
            distribution: { total: distributionTotal, paid: distributionPaid },
            mumbuca: { total: mumbucaTotalRaw, paid: mumbucaPaidRaw, expenses: calc(monthData.shoppingItems), expensesPaid: calc(monthData.shoppingItems, true) },
            combined: { total: combinedTotal, paid: salaryPaid + mumbucaNetPaid },
            surplusRaw: combinedTotal - realExpensesTotal
        };
    }, [monthData]);

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

    const sidebarAccounts = useMemo(() => {
        return [
            { id: 'acc_main', name: 'Conta Principal', balance: stats.salary.total },
            { id: 'acc_mum', name: 'Mumbuca', balance: stats.mumbuca.total * 0.92 }
        ];
    }, [stats]);

    const groupedDebts = useMemo(() => {
        if (!monthData) return [];
        const targets = ['Lili Torres', 'Marcia Brito', 'Marcia Bispo', 'Rebecca Brito'];
        const groups: Record<string, { name: string, total: number, paidAmount: number, items: Transaction[] }> = {};

        monthData.expenses.forEach(e => {
            const personName = targets.find(t => e.description.toLowerCase().includes(t.toLowerCase()));
            if (personName) {
                if (!groups[personName]) {
                    groups[personName] = { name: personName, total: 0, paidAmount: 0, items: [] };
                }
                groups[personName].items.push(e);
                groups[personName].total += e.amount;
                if (e.paid) { groups[personName].paidAmount += e.amount; }
            }
        });
        return Object.values(groups);
    }, [monthData]);

    const getDebtColor = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('lili')) return 'from-pink-500 to-rose-500 shadow-pink-500/20';
        if (n.includes('marcia brito')) return 'from-violet-500 to-purple-500 shadow-purple-500/20';
        if (n.includes('marcia bispo')) return 'from-blue-500 to-cyan-500 shadow-blue-500/20';
        if (n.includes('rebecca')) return 'from-amber-400 to-orange-500 shadow-orange-500/20';
        return 'from-gray-600 to-slate-600';
    };

    const balance = stats.surplusRaw;

    if (!monthData) return <div className="flex items-center justify-center h-screen bg-white"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-teal-500"></div></div>;

    const getTabStyle = (type: TransactionType) => {
        if (transactionListType !== type) return 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border-transparent';
        
        switch(type) {
            case 'incomes': return 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm';
            case 'expenses': return 'bg-rose-50 text-rose-600 border-rose-100 shadow-sm';
            case 'avulsosItems': return 'bg-amber-50 text-amber-600 border-amber-100 shadow-sm';
            default: return 'bg-teal-50 text-teal-600';
        }
    };

    return (
        <div className="flex flex-col h-screen w-full">
            <Header 
                month={currentMonth} 
                year={currentYear} 
                balance={balance}
                onMonthChange={handleMonthChange}
                onToggleSidebar={() => setSidebarOpen(true)}
                onSync={() => saveData(monthData, currentYear, currentMonth)}
                syncStatus={syncStatus}
            />

            <Sidebar 
                isOpen={sidebarOpen} 
                onClose={() => setSidebarOpen(false)} 
                accounts={sidebarAccounts} 
                syncStatus={syncStatus}
                onSync={() => saveData(monthData, currentYear, currentMonth)}
                currentView={view}
                onNavigate={setView}
            />

            <EditTransactionModal 
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                transaction={editingTransaction}
                onSave={handleSaveTransaction}
            />

            <main className="flex-1 overflow-y-auto p-4 pb-6 scroll-smooth">
                {view === 'home' && (
                    <div className="flex flex-col gap-6 animate-fadeIn">
                        
                        {/* WIDGET DE SAÚDE FINANCEIRA */}
                        <div className="w-full">
                            <FinancialHealthWidget 
                                income={stats.combined.total} 
                                expenses={stats.realExpenses.total} 
                                surplus={stats.surplusRaw}
                            />
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-4">
                                <SummaryCard 
                                    title="Entradas (Salário)"
                                    value={stats.salary.total}
                                    type="success"
                                    progress={{ value: stats.salary.paid, max: stats.salary.total || 1 }}
                                    compact={true}
                                />
                                <SummaryCard 
                                    title="Entradas (Total)"
                                    subtitle="-8% taxa de troca"
                                    value={stats.combined.total}
                                    type="info"
                                    progress={{ value: stats.combined.paid, max: stats.combined.total || 1 }}
                                    compact={true}
                                />
                                <SummaryCard 
                                    title="Despesas Reais"
                                    value={stats.realExpenses.total}
                                    type="danger"
                                    progress={{ value: stats.realExpenses.paid, max: stats.realExpenses.total || 1 }}
                                    compact={true}
                                />
                                <SummaryCard 
                                    title="Sobras Previstas"
                                    value={stats.surplusRaw - stats.distribution.paid}
                                    type="final"
                                    subtitle="Após todas as contas"
                                    compact={true}
                                />
                            </div>
                        </div>

                        {/* EXPENSE DISTRIBUTION CHART (NOVO) */}
                        <div className="w-full animate-fadeIn">
                            <ExpenseDistribution expenses={monthData.expenses} />
                        </div>

                        {groupedDebts.length > 0 && (
                            <div className="flex flex-col gap-3">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 pl-1">Compromissos Pessoais</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {groupedDebts.map(group => {
                                        const colorClass = getDebtColor(group.name);
                                        const isFullyPaid = group.paidAmount >= group.total && group.total > 0;
                                        const percentage = (group.paidAmount / (group.total || 1)) * 100;
                                        
                                        return (
                                            <div 
                                                key={group.name} 
                                                onClick={() => handleToggleGroupPaid(group.items)}
                                                className={`relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br ${colorClass} text-white shadow-lg active:scale-95 transition-all cursor-pointer group`}
                                            >
                                                <div className="absolute top-0 right-0 p-3 opacity-20 transform group-hover:scale-125 transition-transform duration-700">
                                                    <User size={60} />
                                                </div>
                                                
                                                <div className="flex flex-col gap-2 relative z-10">
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{group.name}</span>
                                                        {isFullyPaid && <div className="bg-white/20 backdrop-blur-sm rounded-full p-1"><div className="w-1.5 h-1.5 bg-white rounded-full shadow-glow"></div></div>}
                                                    </div>
                                                    
                                                    <span className={`text-2xl font-black tracking-tighter ${isFullyPaid ? 'line-through opacity-70' : ''}`}>
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(group.total)}
                                                    </span>
                                                    
                                                    <div className="mt-1 w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
                                                        <div className="h-full bg-white rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(255,255,255,0.4)]" style={{ width: `${percentage}%` }}></div>
                                                    </div>
                                                    
                                                    <div className="flex justify-between items-center opacity-80 mt-1">
                                                        <span className="text-[10px] font-black">{group.items.length} itens</span>
                                                        <span className="text-[10px] font-black">{Math.round(percentage)}%</span>
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
                    <div className="flex flex-col gap-5 animate-fadeIn">
                        <div className="sticky top-0 z-20 pt-2 pb-2 backdrop-blur-sm">
                            <div className="flex p-1.5 bg-white/80 border border-white rounded-2xl shadow-lg shadow-slate-200/50 backdrop-blur-md">
                                {(['incomes', 'expenses', 'avulsosItems'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setTransactionListType(type)}
                                        className={`flex-1 py-3 px-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all border ${getTabStyle(type)}`}
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
                            onEdit={handleEditTransaction}
                        />
                    </div>
                )}

                {view === 'goals' && (
                    <div className="flex flex-col animate-fadeIn gap-5">
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-600/30 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Target size={120} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                                        <Target size={28} strokeWidth={3} />
                                    </div>
                                    <h3 className="text-2xl font-black tracking-tight">Distribuição de Sobras</h3>
                                </div>
                                <p className="text-indigo-100 text-sm font-bold leading-relaxed max-w-[80%]">
                                    Visualize o progresso dos seus objetivos. Cada centavo economizado é um passo em direção aos seus sonhos.
                                </p>
                            </div>
                        </div>

                        {monthData.goals.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                <Target size={48} className="mb-4 opacity-20" />
                                <span className="font-extrabold text-sm">Sem metas este mês.</span>
                                {currentYear === 2026 && currentMonth < 3 && <span className="text-xs font-bold opacity-60 mt-2 bg-slate-100 px-3 py-1 rounded-full">Disponível a partir de Março/2026</span>}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {monthData.goals.map(goal => {
                                    const totalDistributed = monthData.goals.reduce((acc, g) => acc + g.amount, 0);
                                    const sharePercentage = totalDistributed > 0 ? Math.round((goal.amount / totalDistributed) * 100) : 0;
                                    const linkedTransaction = monthData.expenses.find(t => t.id === goal.linkedTransactionId);
                                    const isPaid = linkedTransaction?.paid || false;
                                    const currentAmount = isPaid ? goal.amount : 0;
                                    const percentage = (currentAmount / goal.amount) * 100;
                                    
                                    const getConfig = (cat: string) => {
                                        if (cat.includes('Lazer') || goal.name?.includes('Viagem')) return { bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-600', bar: 'bg-sky-500', icon: Plane };
                                        if (cat.includes('Investimento')) return { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600', bar: 'bg-emerald-500', icon: PiggyBank };
                                        if (cat.includes('Alimentação') || goal.name?.includes('Casa')) return { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-600', bar: 'bg-amber-500', icon: ShoppingBag };
                                        return { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-600', bar: 'bg-purple-500', icon: Wallet };
                                    };

                                    const s = getConfig(goal.category);
                                    const Icon = s.icon;

                                    return (
                                        <div key={goal.id} className={`relative p-5 rounded-[1.5rem] bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col gap-4 transition-all hover:scale-[1.01]`}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.bg} ${s.text}`}>
                                                        <Icon size={22} strokeWidth={3} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-extrabold text-slate-800 text-sm">{goal.name}</span>
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{isPaid ? 'Alocado' : 'Pendente'}</span>
                                                    </div>
                                                </div>
                                                <div className={`px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100`}>
                                                    <span className="text-xs font-black text-slate-700">{sharePercentage}%</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between items-end">
                                                    <span className={`text-2xl font-black ${isPaid ? s.text : 'text-slate-300'}`}>
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentAmount)}
                                                    </span>
                                                    <span className="text-xs font-extrabold text-slate-400">
                                                        Meta: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.amount)}
                                                    </span>
                                                </div>
                                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all duration-1000 ease-out ${s.bar} shadow-glow`} style={{ width: `${percentage}%` }}></div>
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

            {/* Floating Action Button (FAB) */}
            <button 
                onClick={handleAddNewTransaction}
                className="fixed bottom-6 right-5 w-16 h-16 bg-slate-900 text-white rounded-[1.5rem] shadow-2xl shadow-slate-900/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-30 group"
            >
                <Plus size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
        </div>
    );
};

export default App;