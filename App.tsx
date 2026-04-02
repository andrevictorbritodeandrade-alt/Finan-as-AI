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
import { Target, Plus, ShoppingBag, User, Plane, Wallet, PiggyBank, Home as HomeIcon, Palmtree, Heart, Car, GraduationCap, MoreHorizontal, TrendingUp, ShoppingCart } from 'lucide-react';

const App: React.FC = () => {
    // App State
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1); // Inicia no mês atual
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [monthData, setMonthData] = useState<MonthData | null>(null);
    const [view, setView] = useState<'home' | 'transactions' | 'goals'>('home');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'offline' | 'syncing' | 'online'>('offline');
    const [transactionListType, setTransactionListType] = useState<TransactionType>('expenses');
    const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'goals'>('overview');

    // Edit Modal State
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Force refresh for April 2026 updates
    useEffect(() => {
        const forceUpdateApr = localStorage.getItem('force_update_apr2026_v2');
        if (!forceUpdateApr) {
            localStorage.removeItem('financeData_2026_4');
            localStorage.setItem('force_update_apr2026_v2', 'true');
            window.location.reload();
        }
    }, []);

    // Force refresh for March 2026 updates
    useEffect(() => {
        const forceUpdate = localStorage.getItem('force_update_mar2026_v2');
        if (!forceUpdate) {
            localStorage.removeItem('financeData_2026_3');
            localStorage.setItem('force_update_mar2026_v2', 'true');
            window.location.reload();
        }
    }, []);

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

    const setupRealtimeListener = (year: number, month: number) => {
        if (!isConfigured) return;
        const docRef = doc(db, 'families', FAMILY_ID, 'months', `${year}_${month}`);
        
        return onSnapshot(docRef, (snapshot) => {
            if (snapshot.exists()) {
                const cloudData = snapshot.data() as MonthData;
                const localData = monthDataRef.current;

                // Only update if cloud data is newer
                if (!localData || cloudData.updatedAt > localData.updatedAt) {
                    setMonthData(cloudData);
                    localStorage.setItem(getStorageKey(year, month), JSON.stringify(cloudData));
                }
            }
        }, (error) => {
            console.error("Firestore Listener Error", error);
            setSyncStatus('offline');
        });
    };

    const saveData = async (data: MonthData | null, year: number, month: number) => {
        if (!data) return;
        
        const updatedData = { ...data, updatedAt: Date.now() };
        setMonthData(updatedData);
        localStorage.setItem(getStorageKey(year, month), JSON.stringify(updatedData));

        if (isConfigured && auth?.currentUser) {
            setSyncStatus('syncing');
            try {
                const docRef = doc(db, 'families', FAMILY_ID, 'months', `${year}_${month}`);
                await setDoc(docRef, updatedData);
                setSyncStatus('online');
            } catch (e) {
                console.error("Save Error", e);
                setSyncStatus('offline');
            }
        }
    };

    const handleMonthChange = (year: number, month: number) => {
        setCurrentYear(year);
        setCurrentMonth(month);
        loadData(year, month);
        if (isConfigured && auth?.currentUser) {
            setupRealtimeListener(year, month);
        }
    };

    const handleTogglePaid = (id: string, paid: boolean, type: TransactionType) => {
        if (!monthData) return;
        const newData = { ...monthData };
        newData[type] = newData[type].map(t => t.id === id ? { ...t, paid } : t);
        saveData(newData, currentYear, currentMonth);
    };

    const handleToggleGroupPaid = (items: Transaction[]) => {
        if (!monthData) return;
        const allPaid = items.every(i => i.paid);
        const newData = { ...monthData };
        const itemIds = new Set(items.map(i => i.id));
        
        newData.expenses = newData.expenses.map(e => itemIds.has(e.id) ? { ...e, paid: !allPaid } : e);
        saveData(newData, currentYear, currentMonth);
    };

    const handleEditTransaction = (t: Transaction) => {
        setEditingTransaction(t);
        setIsEditModalOpen(true);
    };

    const handleSaveTransaction = (updated: Transaction, type?: TransactionType) => {
        if (!monthData) return;
        const newData = { ...monthData };
        
        // If type is provided, we know exactly where to look
        if (type) {
            newData[type] = newData[type].map(t => t.id === updated.id ? updated : t);
        } else {
            // Search in all lists
            newData.incomes = newData.incomes.map(t => t.id === updated.id ? updated : t);
            newData.expenses = newData.expenses.map(t => t.id === updated.id ? updated : t);
            newData.avulsosItems = newData.avulsosItems.map(t => t.id === updated.id ? updated : t);
        }
        
        saveData(newData, currentYear, currentMonth);
        setIsEditModalOpen(false);
    };

    const handleAddNewTransaction = () => {
        const newT: Transaction = {
            id: `manual_${Date.now()}`,
            description: 'Nova Transação',
            amount: 0,
            category: 'Outros',
            paid: false,
            dueDate: `${currentYear}-${currentMonth.toString().padStart(2,'0')}-15`,
            group: transactionListType === 'expenses' ? 'Despesas Fixas' : undefined
        };
        handleEditTransaction(newT);
    };

    // Stats Calculation
    const stats = useMemo(() => {
        if (!monthData) return { 
            salary: { total: 0, paid: 0 }, 
            combined: { total: 0, paid: 0 }, 
            realExpenses: { total: 0, paid: 0 },
            distribution: { total: 0, paid: 0 },
            surplusRaw: 0
        };

        const salary = monthData.incomes.filter(i => i.category === 'Salário');
        const combined = monthData.incomes;
        const realExpenses = monthData.expenses.filter(e => !e.isDistribution);
        const distribution = monthData.expenses.filter(e => e.isDistribution);

        const sum = (arr: Transaction[]) => arr.reduce((acc, t) => acc + t.amount, 0);
        const sumPaid = (arr: Transaction[]) => arr.filter(t => t.paid).reduce((acc, t) => acc + t.amount, 0);

        const surplusRaw = sum(combined) - sum(realExpenses);

        return {
            salary: { total: sum(salary), paid: sumPaid(salary) },
            combined: { total: sum(combined), paid: sumPaid(combined) },
            realExpenses: { total: sum(realExpenses), paid: sumPaid(realExpenses) },
            distribution: { total: sum(distribution), paid: sumPaid(distribution) },
            surplusRaw
        };
    }, [monthData]);

    const balance = stats.combined.paid - stats.realExpenses.paid;

    // Group Debts by Person
    const groupedDebts = useMemo(() => {
        if (!monthData) return [];
        const groups: Record<string, { name: string, total: number, paidAmount: number, items: Transaction[] }> = {};
        
        monthData.expenses.forEach(e => {
            const match = e.description.match(/\(([^)]+)\)/);
            if (match) {
                const name = match[1].toUpperCase();
                if (!groups[name]) groups[name] = { name, total: 0, paidAmount: 0, items: [] };
                groups[name].total += e.amount;
                if (e.paid) groups[name].paidAmount += e.amount;
                groups[name].items.push(e);
            }
        });

        return Object.values(groups).sort((a, b) => b.total - a.total);
    }, [monthData]);

    const getDebtColor = (name: string) => {
        if (name.includes('LILI')) return 'from-rose-500 to-pink-600';
        if (name.includes('MARCIA')) return 'from-indigo-500 to-blue-600';
        if (name.includes('JADY')) return 'from-amber-500 to-orange-600';
        return 'from-slate-600 to-slate-800';
    };

    const sidebarAccounts = monthData?.bankAccounts || [];

    if (!monthData) return <div className="h-screen w-full flex items-center justify-center bg-slate-50 font-black text-slate-400 animate-pulse">Carregando Finanças...</div>;

    const getTabStyle = (type: TransactionType) => {
        if (transactionListType !== type) return 'text-slate-400 border-transparent';
        switch(type) {
            case 'incomes': return 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm';
            case 'expenses': return 'bg-rose-50 text-rose-600 border-rose-100 shadow-sm';
            case 'avulsosItems': return 'bg-amber-50 text-amber-600 border-amber-100 shadow-sm';
            default: return 'bg-teal-50 text-teal-600';
        }
    };

    return (
        <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-200 p-6 z-50 shadow-xl shadow-slate-200/20">
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-600/20">
                        <Wallet size={24} strokeWidth={2.5} />
                    </div>
                    <span className="text-xl font-black tracking-tighter text-slate-800">Finanças<span className="text-teal-600">.AI</span></span>
                </div>

                <nav className="flex flex-col gap-2 flex-1">
                    <button 
                        onClick={() => { setView('home'); setActiveTab('overview'); }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${view === 'home' && activeTab === 'overview' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <HomeIcon size={20} />
                        Visão Geral
                    </button>
                    <button 
                        onClick={() => { setView('transactions'); }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${view === 'transactions' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <ShoppingBag size={20} />
                        Extrato Detalhado
                    </button>
                    <button 
                        onClick={() => { setView('goals'); }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${view === 'goals' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <Target size={20} />
                        Metas & Planejamento
                    </button>
                </nav>

                <div className="mt-auto pt-6 border-t border-slate-100">
                    <div className="flex flex-col gap-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Carteiras</h4>
                        {sidebarAccounts.map(acc => (
                            <div key={acc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                                        <Wallet size={16} className="text-slate-400" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-600">{acc.name}</span>
                                </div>
                                <span className="text-xs font-black text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(acc.balance)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 flex items-center gap-3 p-2">
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-800">André Silva</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status: Conectado</span>
                        </div>
                    </div>
                </div>
            </aside>

            <div className="flex-1 flex flex-col h-full relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-100/30 blur-[120px] rounded-full -z-10"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100/30 blur-[100px] rounded-full -z-10"></div>

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

                <main className="flex-1 overflow-y-auto p-4 lg:p-8 pb-24 scroll-smooth">
                    {view === 'home' && (
                        <div className="max-w-6xl mx-auto flex flex-col gap-8 animate-fadeIn">
                            
                            {/* Dashboard Header Tabs - Mobile Only */}
                            <div className="lg:hidden flex p-1 bg-white rounded-2xl shadow-sm border border-slate-100 mb-2">
                                <button 
                                    onClick={() => setActiveTab('overview')}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${activeTab === 'overview' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}
                                >
                                    Visão Geral
                                </button>
                                <button 
                                    onClick={() => setView('transactions')}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide text-slate-400"
                                >
                                    Gastos
                                </button>
                            </div>

                            {activeTab === 'overview' && (
                                <>
                                    {/* CATEGORY OVERVIEW - Matching Screenshot 3 */}
                                    <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] p-6 lg:p-8 border border-white/60 shadow-xl shadow-slate-200/40">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                                <PiggyBank size={20} strokeWidth={3} />
                                            </div>
                                            <div className="flex flex-col">
                                                <h3 className="text-lg font-black text-slate-800 tracking-tight">Visão Geral dos Gastos</h3>
                                                <span className="text-xs font-bold text-slate-400">Para onde foi seu dinheiro</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {['Moradia', 'Lazer', 'Saúde', 'Outros', 'Transporte', 'Educação'].map(cat => {
                                                const amount = monthData.expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
                                                const totalExpenses = stats.realExpenses.total || 1;
                                                const percent = Math.round((amount / totalExpenses) * 100);
                                                
                                                const getCatStyle = (c: string) => {
                                                    if (c === 'Moradia') return { bg: 'bg-blue-50', text: 'text-blue-600', bar: 'bg-blue-500', icon: HomeIcon };
                                                    if (c === 'Lazer') return { bg: 'bg-purple-50', text: 'text-purple-600', bar: 'bg-purple-500', icon: Palmtree };
                                                    if (c === 'Saúde') return { bg: 'bg-rose-50', text: 'text-rose-600', bar: 'bg-rose-500', icon: Heart };
                                                    if (c === 'Outros') return { bg: 'bg-slate-50', text: 'text-slate-600', bar: 'bg-slate-500', icon: Wallet };
                                                    if (c === 'Transporte') return { bg: 'bg-amber-50', text: 'text-amber-600', bar: 'bg-amber-500', icon: Car };
                                                    if (c === 'Educação') return { bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500', icon: GraduationCap };
                                                    return { bg: 'bg-gray-50', text: 'text-gray-600', bar: 'bg-gray-500', icon: MoreHorizontal };
                                                };
                                                
                                                const s = getCatStyle(cat);
                                                const Icon = s.icon;

                                                return (
                                                    <div key={cat} className="bg-white rounded-3xl p-5 border border-slate-50 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
                                                        <div className={`w-14 h-14 rounded-2xl ${s.bg} ${s.text} flex items-center justify-center shrink-0`}>
                                                            <Icon size={24} strokeWidth={2.5} />
                                                        </div>
                                                        <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{cat}</span>
                                                            <span className="text-xl font-black text-slate-800 tracking-tight">
                                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}
                                                            </span>
                                                            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                                                                <div className={`h-full ${s.bar} rounded-full`} style={{ width: `${percent}%` }}></div>
                                                            </div>
                                                        </div>
                                                        <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                                                            <svg className="w-full h-full transform -rotate-90">
                                                                <circle cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-slate-100" />
                                                                <circle cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray={125.6} strokeDashoffset={125.6 - (125.6 * percent) / 100} className={s.text} strokeLinecap="round" />
                                                            </svg>
                                                            <span className="absolute text-[10px] font-black text-slate-600">{percent}%</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* DASHBOARD CARDS - Matching Screenshot 1 style */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden min-h-[240px]">
                                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                                <TrendingUp size={140} />
                                            </div>
                                            <div className="relative z-10 h-full flex flex-col">
                                                <h3 className="text-xl font-black mb-6 tracking-tight">Visão Geral do Mês</h3>
                                                <div className="flex gap-8 items-end flex-1">
                                                    <div className="flex flex-col gap-4 flex-1">
                                                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block mb-1">Receitas</span>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-lg font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.combined.total)}</span>
                                                                <div className="flex gap-1 items-end h-8">
                                                                    {[30, 50, 40, 70, 60].map((h, i) => <div key={i} className="w-1.5 bg-emerald-400 rounded-full" style={{ height: `${h}%` }}></div>)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block mb-1">Despesas</span>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-lg font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.realExpenses.total)}</span>
                                                                <div className="flex gap-1 items-end h-8">
                                                                    {[60, 40, 80, 50, 70].map((h, i) => <div key={i} className="w-1.5 bg-rose-400 rounded-full" style={{ height: `${h}%` }}></div>)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="relative w-24 h-24 flex items-center justify-center">
                                                        <svg className="w-full h-full transform -rotate-90">
                                                            <circle cx="48" cy="48" r="40" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                                                            <circle cx="48" cy="48" r="40" fill="transparent" stroke="#10b981" strokeWidth="8" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * 95) / 100} strokeLinecap="round" />
                                                        </svg>
                                                        <div className="absolute flex flex-col items-center">
                                                            <span className="text-xs font-black">95%</span>
                                                            <span className="text-[8px] font-bold opacity-60 uppercase">Total</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-6">
                                            <div className="bg-emerald-500 rounded-[2.5rem] p-8 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
                                                <div className="absolute bottom-0 right-0 p-4 opacity-20">
                                                    <TrendingUp size={80} />
                                                </div>
                                                <h3 className="text-lg font-black mb-4 tracking-tight">Resumo de Receitas</h3>
                                                <div className="flex items-end justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-3xl font-black tracking-tighter">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.combined.total)}
                                                        </span>
                                                        <span className="text-xs font-bold opacity-80 mt-1">Tendência positiva este mês</span>
                                                    </div>
                                                    <div className="w-32 h-16 relative">
                                                        <svg viewBox="0 0 100 40" className="w-full h-full">
                                                            <path d="M0 35 Q 20 30, 40 35 T 80 10 T 100 5" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" />
                                                            <circle cx="80" cy="10" r="4" fill="white" />
                                                            <text x="70" y="25" fill="white" fontSize="8" fontWeight="bold">37%</text>
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-sky-500 rounded-[2.5rem] p-8 text-white shadow-xl shadow-sky-500/20 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-4 opacity-20">
                                                    <Wallet size={80} />
                                                </div>
                                                <h3 className="text-lg font-black mb-2 tracking-tight">Gerenciamento de Contas</h3>
                                                <span className="text-2xl font-black tracking-tighter block mb-1">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.combined.total - stats.realExpenses.paid)}
                                                </span>
                                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/20">
                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Cartões Ativos: 2</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Última Sinc: Há 5 min</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* DISTRIBUTION LIST - Matching Screenshot 2 style */}
                                    <div className="flex flex-col gap-4">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 pl-4">Distribuição de Sobras (Planejamento)</h3>
                                        <div className="flex flex-col gap-3">
                                            {monthData.expenses.filter(e => e.isDistribution).map(alloc => (
                                                <div key={alloc.id} className="bg-orange-50/50 border border-orange-100/50 rounded-3xl p-5 flex items-center justify-between group hover:bg-orange-50 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-orange-600">
                                                            <div className="w-5 h-5 rounded-full border-2 border-slate-200"></div>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{alloc.description}</span>
                                                            <div className="flex items-center gap-1.5">
                                                                <ShoppingCart size={12} className="text-orange-500" />
                                                                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{alloc.category}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-lg font-black text-slate-900 tracking-tight">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(alloc.amount)}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">vence dia 15</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {view === 'transactions' && (
                        <div className="max-w-4xl mx-auto flex flex-col gap-5 animate-fadeIn">
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
                                onUpdate={(updated) => handleSaveTransaction(updated, transactionListType)}
                            />
                        </div>
                    )}

                    {view === 'goals' && (
                        <div className="max-w-4xl mx-auto flex flex-col animate-fadeIn gap-5">
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
        </div>
    );
};

export default App;
