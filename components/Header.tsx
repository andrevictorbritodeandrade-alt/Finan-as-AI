import React, { useState } from 'react';
import { Menu, ChevronLeft, ChevronRight, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../utils/financeUtils';

interface HeaderProps {
    month: number;
    year: number;
    balance: number;
    checkInDate: string | null;
    onMonthChange: (diff: number) => void;
    onSync: () => void;
    syncStatus: 'offline' | 'syncing' | 'online';
}

const Header: React.FC<HeaderProps> = ({ 
    month, year, balance, checkInDate, onMonthChange, onSync, syncStatus 
}) => {
    const [showBalance, setShowBalance] = useState(true);

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const isPositive = balance >= 0;
    
    // Dynamic Greeting
    const hour = new Date().getHours();
    let greeting = "Boa noite";
    if (hour >= 5 && hour < 12) greeting = "Bom dia";
    else if (hour >= 12 && hour < 18) greeting = "Boa tarde";

    // Formatted Date
    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat('pt-BR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
    }).format(today);
    
    // Modern gradients for balance
    const balanceGradient = isPositive 
        ? 'bg-gradient-to-r from-emerald-700 to-teal-600' 
        : 'bg-gradient-to-r from-rose-700 to-pink-600';

    return (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-white/20 pb-4 pt-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] rounded-b-[2rem]">
            {/* Greeting & Actions Row */}
            <div className="flex justify-between items-center px-6 mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">{greeting}, Família!</span>
                        <span className="text-base sm:text-lg font-black text-slate-500 uppercase tracking-widest mt-0.5">{formattedDate}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => {
                            if (window.confirm("Isso irá recarregar os dados padrão deste mês. Deseja continuar?")) {
                                localStorage.removeItem(`financeData_${year}_${month}`);
                                window.location.reload();
                            }
                        }}
                        className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all font-black"
                        title="Resetar Mês"
                    >
                        <RefreshCw size={24} strokeWidth={4} />
                    </button>
                    <button 
                        onClick={onSync}
                        className={`p-2.5 rounded-xl transition-all ${
                            syncStatus === 'online' ? 'bg-emerald-50 text-emerald-600' :
                            syncStatus === 'syncing' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500'
                        }`}
                    >
                        <RefreshCw size={24} strokeWidth={4} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                    </button>
                    <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm hidden sm:block">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" referrerPolicy="no-referrer" />
                    </div>
                </div>
            </div>

            {/* Month Selector Row */}
            <div className="flex justify-center items-center px-5 mb-4">
                <div className="flex items-center gap-2 bg-slate-100/50 p-2 rounded-2xl border border-slate-200/50 backdrop-blur-sm">
                    <button onClick={() => onMonthChange(-1)} className="p-3 rounded-xl hover:bg-white text-slate-500 hover:text-slate-900 hover:shadow-sm transition-all focus:ring-2 focus:ring-teal-500">
                        <ChevronLeft size={28} strokeWidth={4} />
                    </button>
                    <span className="text-xl font-black w-40 text-center text-slate-800 uppercase tracking-widest">
                        {monthNames[month - 1].slice(0, 3)} <span className="text-slate-400">{year}</span>
                    </span>
                    <button onClick={() => onMonthChange(1)} className="p-3 rounded-xl hover:bg-white text-slate-500 hover:text-slate-900 hover:shadow-sm transition-all focus:ring-2 focus:ring-teal-500">
                        <ChevronRight size={28} strokeWidth={4} />
                    </button>
                </div>
            </div>

            {/* Hero: Balance */}
            <div className="flex flex-col items-center justify-center mt-2 px-6">
                <div className="flex items-center gap-2 mb-1 opacity-80">
                     <span className="text-sm font-black uppercase tracking-[0.2em] text-slate-600">Saldo Disponível</span>
                     {checkInDate && (
                         <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(checkInDate))}
                         </span>
                    )}
                     <button onClick={() => setShowBalance(!showBalance)} className="text-slate-500 hover:text-slate-700 transition-colors p-1">
                        {showBalance ? <EyeOff size={20} strokeWidth={4} /> : <Eye size={20} strokeWidth={4} />}
                    </button>
                </div>
                
                <span className={`text-6xl sm:text-7xl font-black tracking-tight text-transparent bg-clip-text ${balanceGradient} drop-shadow-sm transition-all duration-500 ${!showBalance && 'blur-xl select-none opacity-50'}`}>
                    {formatCurrency(balance)}
                </span>
            </div>
        </header>
    );
};

export default Header;