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
        // Futuristic Gradients with stronger text colors
        if (type === 'success') return { 
            bg: 'bg-gradient-to-br from-emerald-500 to-teal-400', 
            shadow: 'shadow-emerald-500/20',
            iconBg: 'bg-white/20', iconColor: 'text-white',
            text: 'text-white', subText: 'text-emerald-50',
            barBg: 'bg-black/10', barFill: 'bg-white',
            icon: TrendingUp
        };
        if (type === 'danger') return { 
            bg: 'bg-gradient-to-br from-rose-500 to-pink-500', 
            shadow: 'shadow-rose-500/20',
            iconBg: 'bg-white/20', iconColor: 'text-white',
            text: 'text-white', subText: 'text-rose-50',
            barBg: 'bg-black/10', barFill: 'bg-white',
            icon: TrendingDown
        };
        if (type === 'final') return { 
            bg: 'bg-gradient-to-br from-violet-600 to-indigo-600', 
            shadow: 'shadow-indigo-500/20',
            iconBg: 'bg-white/20', iconColor: 'text-white',
            text: 'text-white', subText: 'text-indigo-100',
            barBg: 'bg-black/20', barFill: 'bg-white',
            icon: Calculator
        };
        // Info
        return { 
            bg: 'bg-gradient-to-br from-blue-500 to-cyan-400', 
            shadow: 'shadow-blue-500/20',
            iconBg: 'bg-white/20', iconColor: 'text-white',
            text: 'text-white', subText: 'text-blue-50',
            barBg: 'bg-black/10', barFill: 'bg-white',
            icon: Wallet
        };
    };

    const s = getStyles();
    const percentage = progress ? Math.min(100, (progress.value / progress.max) * 100) : 0;
    
    // Calculations for Remaining
    const remaining = progress ? progress.max - progress.value : 0;
    const remainingPercentage = progress ? 100 - percentage : 0;

    const Icon = s.icon;

    return (
        <div className={`relative overflow-hidden rounded-3xl ${s.bg} ${compact ? 'p-4' : 'p-6'} shadow-lg ${s.shadow} transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] h-full flex flex-col justify-between group`}>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform">
                <Icon size={100} />
            </div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-3">
                    <div className={`p-2.5 rounded-2xl backdrop-blur-sm ${s.iconBg} ${s.iconColor} shadow-sm`}>
                        <Icon size={compact ? 18 : 22} strokeWidth={3} />
                    </div>
                    {compact && progress && (
                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg backdrop-blur-md bg-black/10 ${s.text}`}>
                            {Math.round(percentage)}%
                        </span>
                    )}
                </div>
                
                <div className="flex flex-col">
                    <span className={`text-[11px] font-black uppercase tracking-widest opacity-90 mb-1 ${s.text}`}>{title}</span>
                    <span className={`${compact ? 'text-xl' : 'text-3xl'} font-black tracking-tight leading-none ${s.text} drop-shadow-sm`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                    </span>
                    
                    {subtitle && !compact && <span className={`text-sm font-bold mt-1 ${s.subText}`}>{subtitle}</span>}
                    {subtitle && compact && <span className={`text-[10px] font-bold mt-1 ${s.subText} opacity-90`}>{subtitle}</span>}
                </div>
            </div>

            {progress ? (
                <div className="mt-4 relative z-10 flex flex-col gap-2">
                    {/* Progress Bar */}
                    <div>
                        <div className={`flex justify-between text-[10px] font-black mb-1.5 ${s.subText} uppercase tracking-wider`}>
                            <span>Pago</span>
                            {!compact && <span>{format(progress.max)}</span>}
                        </div>
                        <div className={`h-1.5 w-full ${s.barBg} rounded-full overflow-hidden`}>
                            <div className={`h-full rounded-full transition-all duration-700 ease-out ${s.barFill} shadow-[0_0_10px_rgba(255,255,255,0.5)]`} style={{ width: `${percentage}%` }}></div>
                        </div>
                    </div>

                    {/* NEW: Remaining Stats */}
                    {remaining > 0 && (
                        <div className={`flex justify-between items-end border-t border-white/10 pt-2 mt-1`}>
                             <span className={`text-[9px] font-black uppercase tracking-wider ${s.subText} opacity-80`}>Falta</span>
                             <div className="text-right leading-none">
                                <span className={`block text-xs font-black ${s.text}`}>
                                    {format(remaining)}
                                </span>
                                <span className={`text-[9px] font-bold ${s.subText} opacity-80`}>
                                    ({Math.round(remainingPercentage)}%)
                                </span>
                             </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="mt-4 min-h-[1rem]"></div>
            )}
        </div>
    );
};

export default SummaryCard;