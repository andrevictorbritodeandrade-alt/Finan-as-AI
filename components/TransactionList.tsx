import React from 'react';
import { Transaction } from '../types';
import { CATEGORY_ICONS } from '../constants';

interface TransactionListProps {
    transactions: Transaction[];
    onTogglePaid: (id: string, paid: boolean) => void;
    onEdit: (transaction: Transaction) => void;
    compact?: boolean;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onTogglePaid, onEdit, compact = false }) => {
    const format = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    // Grouping Logic
    const grouped = transactions.reduce((groups, transaction) => {
        // If it has a group (e.g. 'Despesas Fixas'), use that. Otherwise use date.
        const key = transaction.group || transaction.dueDate || transaction.date || 'Sem Data';
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(transaction);
        return groups;
    }, {} as Record<string, Transaction[]>);

    // Sorting Keys
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
        // Prioritize specific groups
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
        
        // Otherwise sort by date descending
        return b.localeCompare(a);
    });

    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <span className="text-3xl">💤</span>
                </div>
                <p className="text-base font-bold text-gray-500">Nenhuma movimentação</p>
            </div>
        );
    }

    const formatDateHeader = (key: string) => {
        // If it's a known group name, return as is
        if (key.includes('Distribuição') || key.includes('Despesas') || key === 'Sem Data') return key;

        // Otherwise parse as date
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

    const getHeaderColor = (key: string) => {
        if (key.includes('Distribuição')) return 'text-amber-600 bg-amber-50';
        if (key === 'Despesas Fixas') return 'text-teal-600 bg-gray-50/95';
        if (key === 'Despesas Variáveis') return 'text-indigo-600 bg-gray-50/95';
        return 'text-gray-500 bg-gray-50/95';
    };

    // Compact view logic
    if (compact) {
        const sortedList = [...transactions].sort((a, b) => (b.dueDate || b.date || '').localeCompare(a.dueDate || a.date || '')).slice(0, 5);
        
        return (
            <div className="flex flex-col gap-1 divider-y divide-gray-100">
                {sortedList.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 px-2 rounded-lg transition-colors cursor-pointer" onClick={() => onEdit(item)}>
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-lg border border-gray-100 shrink-0">
                                {CATEGORY_ICONS[item.category] || '📝'}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className={`text-base font-bold truncate ${item.paid ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                    {item.description}
                                </span>
                                <span className="text-xs text-gray-500 font-bold">
                                    {item.category}
                                </span>
                            </div>
                        </div>
                        <span className={`text-base font-extrabold whitespace-nowrap ${item.paid ? 'text-gray-400' : 'text-gray-900'}`}>
                            {format(item.amount)}
                        </span>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col pb-20">
            {sortedKeys.map(key => (
                <div key={key} className="mb-6">
                    <h3 className={`text-sm font-extrabold uppercase tracking-wider mb-2 sticky top-0 backdrop-blur-sm py-2 px-2 rounded-lg z-10 ${getHeaderColor(key)}`}>
                        {formatDateHeader(key)}
                    </h3>
                    <div className="flex flex-col gap-2.5">
                        {grouped[key].map(item => {
                            const isAllocation = key.includes('Distribuição');
                            return (
                                <div 
                                    key={item.id} 
                                    className={`group rounded-2xl p-4 flex gap-3 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border transition-all active:scale-[0.99] cursor-pointer 
                                        ${isAllocation ? 'bg-amber-50/50 border-amber-100 hover:border-amber-200' : 'bg-white border-gray-100 hover:border-teal-100'}
                                        ${item.paid ? 'opacity-60 grayscale-[0.5]' : ''}`}
                                    onClick={(e) => {
                                        if (!(e.target as HTMLElement).closest('.toggle-area')) {
                                            onEdit(item);
                                        }
                                    }}
                                >
                                    <div className="flex items-center toggle-area">
                                         <div 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onTogglePaid(item.id, !item.paid);
                                            }}
                                            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors 
                                                ${item.paid 
                                                    ? 'bg-emerald-500 border-emerald-500' 
                                                    : isAllocation ? 'border-amber-300 group-hover:border-amber-400' : 'border-gray-300 group-hover:border-teal-400'
                                                }`}
                                         >
                                            {item.paid && <span className="text-white text-sm font-bold">✓</span>}
                                         </div>
                                    </div>
                                    <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                                        <div className="flex justify-between items-start">
                                            <span className={`font-bold text-base leading-tight truncate pr-2 ${item.paid ? 'line-through text-gray-500' : isAllocation ? 'text-amber-900' : 'text-gray-800'}`}>
                                                {item.description}
                                            </span>
                                            <span className={`font-extrabold text-base whitespace-nowrap ${item.paid ? 'text-gray-500' : isAllocation ? 'text-amber-900' : 'text-gray-900'}`}>{format(item.amount)}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <span className={`text-xs px-2 py-0.5 rounded font-bold flex items-center gap-1 ${isAllocation ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {CATEGORY_ICONS[item.category]} {item.category}
                                            </span>
                                            
                                            {item.installments && (
                                                <span className="text-xs px-2.5 py-0.5 rounded-lg bg-violet-100 text-violet-700 font-black tracking-wide border border-violet-200 shadow-sm flex items-center gap-1">
                                                    <span className="opacity-70 font-bold text-[10px] uppercase">Parcela</span>
                                                    <span className="text-sm">{item.installments.current}/{item.installments.total}</span>
                                                </span>
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