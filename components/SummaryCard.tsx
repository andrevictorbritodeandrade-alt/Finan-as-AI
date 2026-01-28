import React from 'react';
import { TrendingUp, TrendingDown, Wallet, Calculator } from 'lucide-react';

interface SummaryCardProps {
    title: string;
    value: number;
    subtitle?: string;
    type: 'success' | 'danger' | 'info' | 'final';
    progress?: {
        value: number;
        max: number;
    };
    compact?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, subtitle, type, progress, compact = false }) => {
    const format = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: compact ? "compact" : "standard" }).format(v);

    const getStyles = () => {
        if (type === 'success') return { 
            bg: 'bg-emerald-100', border: 'border-emerald-200', 
            iconBg: 'bg-emerald-200', iconColor: 'text-emerald-700',
            bar: 'bg-emerald-600', 
            titleText: 'text-emerald-800',
            valueText: 'text-emerald-950',
            subText: 'text-emerald-700',
            icon: TrendingUp
        };
        if (type === 'danger') return { 
            bg: 'bg-rose-100', border: 'border-rose-200', 
            iconBg: 'bg-rose-200', iconColor: 'text-rose-700',
            bar: 'bg-rose-600',
            titleText: 'text-rose-800',
            valueText: 'text-rose-950',
            subText: 'text-rose-700',
            icon: TrendingDown
        };
        if (type === 'final') return { 
            bg: 'bg-violet-100', border: 'border-violet-200', 
            iconBg: 'bg-violet-200', iconColor: 'text-violet-700',
            bar: 'bg-violet-600', 
            titleText: 'text-violet-800',
            valueText: 'text-violet-950',
            subText: 'text-violet-700',
            icon: Calculator
        };
        // Info / Blue
        return { 
            bg: 'bg-blue-100', border: 'border-blue-200', 
            iconBg: 'bg-blue-200', iconColor: 'text-blue-700',
            bar: 'bg-blue-600', 
            titleText: 'text-blue-800',
            valueText: 'text-blue-950',
            subText: 'text-blue-700',
            icon: Wallet
        };
    };

    const s = getStyles();
    const percentage = progress ? Math.min(100, (progress.value / progress.max) * 100) : 0;
    const Icon = s.icon;

    return (
        <div className={`relative overflow-hidden rounded-2xl border ${s.border} ${s.bg} ${compact ? 'p-3' : 'p-5'} transition-all duration-200 hover:shadow-md`}>
            <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-xl ${s.iconBg} ${s.iconColor}`}>
                    <Icon size={compact ? 20 : 24} strokeWidth={2.5} />
                </div>
                {compact && progress && (
                    <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md bg-white/60 ${s.subText}`}>
                        {Math.round(percentage)}%
                    </span>
                )}
            </div>
            
            <div className="flex flex-col">
                <span className={`text-sm font-bold uppercase tracking-wide mb-0.5 ${s.titleText}`}>{title}</span>
                <span className={`${compact ? 'text-2xl' : 'text-3xl'} font-extrabold tracking-tight ${s.valueText}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                </span>
                
                {subtitle && !compact && <span className={`text-sm font-medium mt-1 ${s.subText}`}>{subtitle}</span>}
                {subtitle && compact && <span className={`text-xs font-medium mt-0.5 ${s.subText} opacity-80`}>{subtitle}</span>}
            </div>

            {progress && (
                <div className="mt-3">
                    <div className={`flex justify-between text-xs font-bold mb-1 ${s.subText}`}>
                        <span>Pago: {format(progress.value)}</span>
                        {!compact && <span>Total: {format(progress.max)}</span>}
                    </div>
                    <div className="h-2 w-full bg-white/50 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ease-out ${s.bar}`} style={{ width: `${percentage}%` }}></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SummaryCard;