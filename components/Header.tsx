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
        <header className="sticky top-0 z-40 bg-[#f0fdf4]/95 backdrop-blur-xl border-b border-emerald-100/50 pb-4 pt-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] rounded-b-[2rem]">
            {/* Greeting & Action Buttons Row */}
            <div className="flex justify-between items-center px-6 mb-4">
                <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-800 tracking-tight capitalize">{greeting}, Família!</span>
                    <span className="text-sm font-black text-slate-400 uppercase tracking-wider">{formattedDate}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => {
                            if (window.confirm("Isso irá recarregar os dados padrão deste mês. Deseja continuar?")) {
                                localStorage.removeItem(`financeData_${year}_${month}`);
                                window.location.reload();
                            }
                        }}
                        className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all font-black"
                        title="Resetar Mês"
                    >
                        <RefreshCw size={20} strokeWidth={4} />
                    </button>
                    <button 
                        onClick={onSync}
                        className={`p-2 rounded-xl transition-all ${
                            syncStatus === 'online' ? 'bg-emerald-50 text-emerald-600' :
                            syncStatus === 'syncing' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500'
                        }`}
                    >
                        <RefreshCw size={20} strokeWidth={4} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Month Selector Row */}
            <div className="flex justify-center items-center px-5 mb-4">
                <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 backdrop-blur-sm">
                    <button onClick={() => onMonthChange(-1)} className="p-2 rounded-xl hover:bg-white text-slate-500 hover:text-slate-900 shadow-sm transition-all">
                        <ChevronLeft size={20} strokeWidth={4} />
                    </button>
                    <span className="text-sm font-black w-32 text-center text-slate-800 uppercase tracking-widest">
                        {monthNames[month - 1].slice(0, 3)} <span className="text-slate-400">{year}</span>
                    </span>
                    <button onClick={() => onMonthChange(1)} className="p-2 rounded-xl hover:bg-white text-slate-500 hover:text-slate-900 shadow-sm transition-all">
                        <ChevronRight size={20} strokeWidth={4} />
                    </button>
                </div>
            </div>

            {/* Hero: Balance */}
            <div className="flex flex-col items-center justify-center mt-2 px-6">
                <div className="flex items-center gap-2 mb-1">
                     <span className="text-xs font-black uppercase tracking-wider text-slate-500">Saldo Disponível</span>
                     {checkInDate && (
                         <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                            Cheque: {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(checkInDate))}
                         </span>
                    )}
                     <button onClick={() => setShowBalance(!showBalance)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                        {showBalance ? <EyeOff size={16} strokeWidth={4} /> : <Eye size={16} strokeWidth={4} />}
                    </button>
                </div>
                
                <span className={`text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text ${balanceGradient} drop-shadow-sm transition-all duration-500 ${!showBalance && 'blur-xl select-none opacity-50'}`}>
                    {formatCurrency(balance)}
                </span>
            </div>
        </header>
    );
};

export default Header;