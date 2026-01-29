import React from 'react';
import { X, Cloud, CloudOff, RefreshCw, Plus, Home, List, Target, Wallet } from 'lucide-react';
import { BankAccount } from '../types';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    accounts: BankAccount[];
    syncStatus: 'online' | 'offline' | 'syncing';
    onSync: () => void;
    currentView: 'home' | 'transactions' | 'goals';
    onNavigate: (view: 'home' | 'transactions' | 'goals') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, accounts, syncStatus, onSync, currentView, onNavigate }) => {
    const format = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);

    const handleNav = (view: 'home' | 'transactions' | 'goals') => {
        onNavigate(view);
        onClose();
    };

    const getNavClass = (view: string) => {
        const isActive = currentView === view;
        return `flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-extrabold text-base ${
            isActive 
            ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`;
    };

    return (
        <>
            <div 
                className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 transition-opacity duration-500 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={onClose}
            ></div>
            <div className={`fixed top-0 left-0 w-[85%] max-w-xs h-full bg-white z-[51] shadow-2xl transform transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-8 border-b border-dashed border-gray-100 flex justify-between items-center">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Finanças<span className="text-teal-600">.AI</span></h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                        <X size={24} strokeWidth={3} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-10">
                    {/* Navigation Section */}
                    <section>
                         <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Menu Principal</h3>
                         <div className="flex flex-col gap-2">
                            <button onClick={() => handleNav('home')} className={getNavClass('home')}>
                                <Home size={22} strokeWidth={3} /> Visão Geral
                            </button>
                            <button onClick={() => handleNav('transactions')} className={getNavClass('transactions')}>
                                <List size={22} strokeWidth={3} /> Extrato Detalhado
                            </button>
                            <button onClick={() => handleNav('goals')} className={getNavClass('goals')}>
                                <Target size={22} strokeWidth={3} /> Metas & Planejamento
                            </button>
                         </div>
                    </section>

                    <section>
                        <div className="flex items-center justify-between mb-4 px-2">
                             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Carteiras</h3>
                        </div>
                        <div className="flex flex-col gap-3">
                            {accounts.map(acc => (
                                <div key={acc.id} className="group bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-slate-300 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-xl text-slate-700 shadow-sm group-hover:text-indigo-600 transition-colors">
                                            <Wallet size={18} strokeWidth={3} />
                                        </div>
                                        <span className="font-extrabold text-sm text-slate-700">{acc.name}</span>
                                    </div>
                                    <span className="font-black text-sm text-slate-900">{format(acc.balance)}</span>
                                </div>
                            ))}
                            <div className="mt-2 flex justify-between items-center px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl shadow-lg shadow-slate-900/20 text-white">
                                <span className="font-extrabold text-sm opacity-80">Total Global</span>
                                <span className="font-black text-lg">{format(totalBalance)}</span>
                            </div>
                        </div>
                    </section>

                    <section>
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-3xl border border-indigo-100 flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-sm font-extrabold text-indigo-900">
                                {syncStatus === 'online' ? <Cloud size={18} strokeWidth={3} className="text-indigo-600"/> : <CloudOff size={18} strokeWidth={3} className="text-slate-400"/>}
                                <span>Status: <span className={syncStatus === 'online' ? 'text-indigo-600' : 'text-slate-500'}>
                                    {syncStatus === 'online' ? 'Conectado' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Offline'}
                                </span></span>
                            </div>
                            <button 
                                onClick={onSync}
                                className="w-full py-3.5 flex items-center justify-center gap-2 text-sm font-black text-indigo-600 bg-white rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all"
                            >
                                <RefreshCw size={16} strokeWidth={4} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                                Sincronizar Agora
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
};

export default Sidebar;