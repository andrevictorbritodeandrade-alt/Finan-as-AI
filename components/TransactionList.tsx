import React from 'react';
import { Transaction } from '../types';
import { 
    Banknote, CreditCard, Home, ShoppingCart, Car, Heart, GraduationCap, 
    Palmtree, TrendingDown, TrendingUp, Fuel, Gift, Coins, MoreHorizontal, FileWarning,
    Calendar, CheckCircle2
} from 'lucide-react';

interface TransactionListProps {
    transactions: Transaction[];
    onTogglePaid: (id: string, paid: boolean) => void;
    onEdit: (transaction: Transaction) => void;
    compact?: boolean;
}

// Helper para ícones
const getCategoryIcon = (category: string) => {
    const props = { size: 18, strokeWidth: 3 }; // Aumentado strokeWidth
    switch (category) {
        case 'Salário': return <Banknote {...props} />;
        case 'Mumbuca': return <CreditCard {...props} />;
        case 'Moradia': return <Home {...props} />;
        case 'Alimentação': return <ShoppingCart {...props} />;
        case 'Transporte': return <Car {...props} />;
        case 'Saúde': return <Heart {...props} />;
        case 'Educação': return <GraduationCap {...props} />;
        case 'Lazer': return <Palmtree {...props} />;
        case 'Dívidas': return <FileWarning {...props} />;
        case 'Investimento': return <TrendingUp {...props} />;
        case 'Abastecimento': return <Fuel {...props} />;
        case 'Doação': return <Gift {...props} />;
        case 'Renda Extra': return <Coins {...props} />;
        default: return <MoreHorizontal {...props} />;
    }
};

const getCategoryColor = (category: string) => {
    switch (category) {
        case 'Salário': return 'bg-emerald-100 text-emerald-700';
        case 'Mumbuca': return 'bg-rose-100 text-rose-700';
        case 'Moradia': return 'bg-blue-100 text-blue-700';
        case 'Alimentação': return 'bg-orange-100 text-orange-700';
        case 'Lazer': return 'bg-purple-100 text-purple-700';
        case 'Investimento': return 'bg-amber-100 text-amber-700';
        default: return 'bg-gray-100 text-gray-700';
    }
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onTogglePaid, onEdit, compact = false }) => {
    const format = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    // Grouping Logic
    const grouped = transactions.reduce((groups, transaction) => {
        const key = transaction.group || transaction.dueDate || transaction.date || 'Sem Data';
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(transaction);
        return groups;
    }, {} as Record<string, Transaction[]>);

    // Sorting Keys
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
        const priority = [
            'Distribuição de Sobras (Planejamento)',
            'Despesas Fixas',
            'Despesas Variáveis'
        ];
        const idxA = priority.indexOf(a);
        const idxB = priority.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return b.localeCompare(a);
    });

    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <div className="w-20 h-20 bg-gradient-to-tr from-gray-50 to-white rounded-full flex items-center justify-center mb-4 shadow-inner">
                    <Calendar size={32} className="opacity-50" strokeWidth={2.5} />
                </div>
                <p className="text-sm font-extrabold text-gray-400 uppercase tracking-widest">Nenhuma movimentação</p>
            </div>
        );
    }

    const formatDateHeader = (key: string) => {
        if (key.includes('Distribuição') || key.includes('Despesas') || key === 'Sem Data') return key;
        const [year, month, day] = key.split('-');
        if (!year || !month || !day) return key;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const today = new Date();
        today.setHours(0,0,0,0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const transactionDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

        if (transactionDate.getTime() === today.getTime()) return 'Hoje';
        if (transactionDate.getTime() === yesterday.getTime()) return 'Ontem';

        return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', weekday: 'short' }).format(date);
    };

    const getHeaderStyle = (key: string) => {
        if (key.includes('Distribuição')) return 'text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-700';
        if (key === 'Despesas Fixas') return 'text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-700';
        if (key === 'Despesas Variáveis') return 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-700';
        return 'text-gray-600';
    };

    if (compact) {
        const sortedList = [...transactions].sort((a, b) => (b.dueDate || b.date || '').localeCompare(a.dueDate || a.date || '')).slice(0, 5);
        return (
            <div className="flex flex-col gap-2">
                {sortedList.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-3 px-3 bg-white rounded-xl shadow-sm border border-gray-50 hover:shadow-md transition-all cursor-pointer" onClick={() => onEdit(item)}>
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getCategoryColor(item.category)} shrink-0`}>
                                {getCategoryIcon(item.category)}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className={`text-sm font-extrabold truncate ${item.paid ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                    {item.description}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    {item.category}
                                </span>
                            </div>
                        </div>
                        <span className={`text-sm font-black whitespace-nowrap ${item.paid ? 'text-gray-400' : 'text-gray-900'}`}>
                            {format(item.amount)}
                        </span>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col pb-24">
            {sortedKeys.map(key => (
                <div key={key} className="mb-6 animate-fadeIn">
                    <div className="sticky top-0 z-10 backdrop-blur-md bg-slate-50/80 py-3 mb-2 px-1 rounded-lg">
                        <h3 className={`text-xs font-black uppercase tracking-widest ${getHeaderStyle(key)}`}>
                            {formatDateHeader(key)}
                        </h3>
                    </div>
                    <div className="flex flex-col gap-3">
                        {grouped[key].map(item => {
                            const isAllocation = key.includes('Distribuição');
                            return (
                                <div 
                                    key={item.id} 
                                    className={`relative group rounded-2xl p-4 flex items-center gap-4 border transition-all duration-300 active:scale-[0.98] cursor-pointer overflow-hidden
                                        ${isAllocation 
                                            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-orange-100 shadow-sm' 
                                            : 'bg-white border-white shadow-[0_4px_20px_-12px_rgba(0,0,0,0.08)] hover:shadow-lg'
                                        }
                                        ${item.paid ? 'opacity-60 grayscale-[0.5]' : ''}`}
                                    onClick={(e) => {
                                        if (!(e.target as HTMLElement).closest('.toggle-area')) {
                                            onEdit(item);
                                        }
                                    }}
                                >
                                    {/* SWITCH TOGGLE BUTTON - Modernized */}
                                    <div className="toggle-area shrink-0 self-center z-10">
                                         <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onTogglePaid(item.id, !item.paid);
                                            }}
                                            className={`relative w-12 h-7 rounded-full transition-all duration-500 ease-out focus:outline-none ${
                                                item.paid 
                                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                                                    : 'bg-gray-200 shadow-inner'
                                            }`}
                                         >
                                            <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) flex items-center justify-center ${
                                                item.paid ? 'translate-x-5' : 'translate-x-0'
                                            }`}>
                                                {item.paid && <CheckCircle2 size={10} className="text-emerald-600" strokeWidth={4} />}
                                            </div>
                                         </button>
                                    </div>

                                    {/* CONTENT */}
                                    <div className="flex-1 flex flex-col gap-1 overflow-hidden z-10">
                                        <div className="flex justify-between items-start gap-3">
                                            <span className={`font-extrabold text-sm sm:text-base leading-tight break-words ${item.paid ? 'text-gray-400 line-through' : isAllocation ? 'text-amber-900' : 'text-slate-800'}`}>
                                                {item.description}
                                            </span>
                                            <span className={`font-black text-sm sm:text-base whitespace-nowrap shrink-0 tracking-tight ${item.paid ? 'text-gray-400' : isAllocation ? 'text-amber-900' : 'text-slate-900'}`}>
                                                {format(item.amount)}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${getCategoryColor(item.category)} bg-opacity-50`}>
                                                {getCategoryIcon(item.category)}
                                                <span>{item.category}</span>
                                            </div>
                                            
                                            {item.installments && (
                                                <div className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1.5 shadow-sm">
                                                    <span className="text-[10px] font-black tracking-widest uppercase opacity-70">Parc.</span>
                                                    <span className="text-xs font-extrabold">{item.installments.current}/{item.installments.total}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TransactionList;