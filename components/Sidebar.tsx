import React from 'react';
import { X, Cloud, CloudOff, RefreshCw, Plus, Home, List, Target } from 'lucide-react';
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
        return `flex items-center gap-3 w-full p-4 rounded-xl transition-all font-bold text-base ${
            isActive 
            ? 'bg-teal-50 text-teal-700 shadow-sm border border-teal-100' 
            : 'text-gray-600 hover:bg-gray-50'
        }`;
    };

    return (
        <>
            <div 
                className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={onClose}
            ></div>
            <div className={`fixed top-0 left-0 w-[85%] max-w-xs h-full bg-white z-[51] shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-2xl font-extrabold text-gray-900">Menu</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
                        <X size={26} strokeWidth={2.5} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-8">
                    {/* Navigation Section */}
                    <section>
                         <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3 px-2">Navegação</h3>
                         <div className="flex flex-col gap-2">
                            <button onClick={() => handleNav('home')} className={getNavClass('home')}>
                                <Home size={22} strokeWidth={2.5} /> Início
                            </button>
                            <button onClick={() => handleNav('transactions')} className={getNavClass('transactions')}>
                                <List size={22} strokeWidth={2.5} /> Extrato
                            </button>
                            <button onClick={() => handleNav('goals')} className={getNavClass('goals')}>
                                <Target size={22} strokeWidth={2.5} /> Metas
                            </button>
                         </div>
                    </section>

                    <section>
                        <div className="flex items-center justify-between mb-4 px-2">
                             <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Contas</h3>
                        </div>
                        <div className="flex flex-col gap-3">
                            {accounts.map(acc => (
                                <div key={acc.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                                    <span className="font-bold text-base text-gray-700">{acc.name}</span>
                                    <span className="font-extrabold text-base text-gray-900">{format(acc.balance)}</span>
                                </div>
                            ))}
                            <div className="mt-2 flex justify-between items-center px-4 py-3 bg-teal-50 rounded-xl border border-teal-100">
                                <span className="font-extrabold text-teal-800 text-lg">Saldo Total</span>
                                <span className="font-extrabold text-teal-800 text-lg">{format(totalBalance)}</span>
                            </div>
                            <button className="mt-2 w-full py-3 flex items-center justify-center gap-2 text-base font-bold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                                <Plus size={20} strokeWidth={2.5} /> Adicionar Conta
                            </button>
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center justify-between mb-4 px-2">
                             <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Nuvem & Backup</h3>
                        </div>
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-base font-bold text-gray-700">
                                {syncStatus === 'online' ? <Cloud size={20} className="text-green-500"/> : <CloudOff size={20} className="text-gray-400"/>}
                                <span>Status: <span className={syncStatus === 'online' ? 'text-green-600' : 'text-gray-500'}>
                                    {syncStatus === 'online' ? 'Conectado' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Offline'}
                                </span></span>
                            </div>
                            <p className="text-sm font-medium text-gray-500 leading-relaxed">O backup é automático e ocorre a cada mudança.</p>
                            <button 
                                onClick={onSync}
                                className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-white bg-gray-900 rounded-xl hover:bg-gray-800 active:scale-95 transition-all"
                            >
                                <RefreshCw size={18} strokeWidth={2.5} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                                Forçar Sincronização
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
};

export default Sidebar;