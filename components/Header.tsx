import React, { useState } from 'react';
import { Menu, ChevronLeft, ChevronRight, Eye, EyeOff, RefreshCw, Sparkles } from 'lucide-react';

interface HeaderProps {
    month: number;
    year: number;
    balance: number;
    onMonthChange: (diff: number) => void;
    onToggleSidebar: () => void;
    onOpenAi: () => void;
    onSync: () => void;
    syncStatus: 'offline' | 'syncing' | 'online';
}

const Header: React.FC<HeaderProps> = ({ 
    month, year, balance, onMonthChange, onToggleSidebar, onOpenAi, onSync, syncStatus 
}) => {
    const [showBalance, setShowBalance] = useState(true);

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const isPositive = balance >= 0;
    
    // Dynamic styles based on balance
    const balanceColor = isPositive ? 'text-emerald-600' : 'text-rose-600';
    const monthColor = isPositive ? 'text-teal-900' : 'text-rose-900';
    const monthBg = isPositive ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700';
    const navBtnHover = isPositive ? 'hover:text-teal-600' : 'hover:text-rose-600';

    return (
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 pb-4 pt-2 shadow-[0_4px_20px_-12px_rgba(0,0,0,0.1)] rounded-b-3xl transition-colors duration-500">
            {/* Top Row: Navigation & Actions */}
            <div className="flex justify-between items-center px-4 mb-2">
                <button onClick={onToggleSidebar} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                    <Menu size={24} strokeWidth={2.5} />
                </button>

                <div className={`flex items-center gap-3 px-2 py-1 rounded-full transition-colors duration-300 ${isPositive ? 'bg-gray-100/80' : 'bg-rose-50/50'}`}>
                    <button onClick={() => onMonthChange(-1)} className={`p-1.5 rounded-full hover:bg-white text-gray-500 hover:shadow-sm transition-all ${navBtnHover}`}>
                        <ChevronLeft size={20} strokeWidth={3} />
                    </button>
                    <span className={`text-base font-extrabold w-28 text-center select-none transition-colors duration-300 ${monthColor}`}>
                        {monthNames[month - 1].slice(0, 3)} <span className="opacity-60">{year}</span>
                    </span>
                    <button onClick={() => onMonthChange(1)} className={`p-1.5 rounded-full hover:bg-white text-gray-500 hover:shadow-sm transition-all ${navBtnHover}`}>
                        <ChevronRight size={20} strokeWidth={3} />
                    </button>
                </div>

                <div className="flex items-center gap-1">
                    <button 
                        onClick={onSync}
                        className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${
                            syncStatus === 'online' ? 'text-emerald-500' :
                            syncStatus === 'syncing' ? 'text-blue-500 animate-spin' : 'text-gray-400'
                        }`}
                    >
                        <RefreshCw size={22} strokeWidth={2.5} />
                    </button>
                    <button onClick={onOpenAi} className="p-2 rounded-full bg-gradient-to-tr from-teal-50 to-emerald-50 text-teal-600 border border-teal-100 hover:shadow-md transition-all">
                        <Sparkles size={22} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Hero: Balance */}
            <div className="flex flex-col items-center justify-center mt-3">
                <span className={`text-sm font-bold tracking-wide uppercase transition-colors ${isPositive ? 'text-gray-400' : 'text-rose-400'}`}>
                    Saldo Disponível
                </span>
                <div className="flex items-center gap-3 mt-1">
                    <span className={`text-5xl font-black tracking-tighter transition-colors duration-500 ${!showBalance && 'blur-md select-none'} ${balanceColor}`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
                    </span>
                    <button onClick={() => setShowBalance(!showBalance)} className={`transition-colors ${isPositive ? 'text-gray-300 hover:text-emerald-500' : 'text-rose-200 hover:text-rose-500'}`}>
                        {showBalance ? <EyeOff size={20} strokeWidth={2.5} /> : <Eye size={20} strokeWidth={2.5} />}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;