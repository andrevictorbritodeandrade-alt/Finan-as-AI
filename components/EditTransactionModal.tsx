import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '../types';
import { X, Save, Calendar, Tag, DollarSign, Type, Check, ChevronDown, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { 
    Banknote, CreditCard, Home, ShoppingCart, Car, Heart, GraduationCap, 
    Palmtree, TrendingDown, TrendingUp, Fuel, Gift, Coins, MoreHorizontal, FileWarning 
} from 'lucide-react';

interface EditTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction | null;
    onSave: (updatedTransaction: Transaction, type: TransactionType) => void;
}

const getCategoryIcon = (category: string) => {
    const props = { size: 16, strokeWidth: 3 };
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

const CATEGORIES = [
    'Salário', 'Mumbuca', 'Moradia', 'Alimentação', 'Transporte', 'Saúde', 
    'Educação', 'Lazer', 'Dívidas', 'Investimento', 'Abastecimento', 
    'Doação', 'Renda Extra', 'Outros'
];

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ isOpen, onClose, transaction, onSave }) => {
    const [formData, setFormData] = useState<Transaction | null>(null);
    const [transactionType, setTransactionType] = useState<TransactionType>('expenses');

    useEffect(() => {
        if (isOpen) {
            if (transaction) {
                // Editing existing
                setFormData({ ...transaction });
                // Infer type (simple logic, parent usually knows, but we can default to expenses if unknown or check category)
                const isIncome = ['Salário', 'Mumbuca', 'Renda Extra', 'Doação'].includes(transaction.category);
                setTransactionType(isIncome ? 'incomes' : 'expenses');
            } else {
                // Creating new
                setFormData({
                    id: `new_${Date.now()}`,
                    description: '',
                    amount: 0,
                    category: 'Outros',
                    paid: false,
                    date: new Date().toISOString().split('T')[0],
                    dueDate: new Date().toISOString().split('T')[0],
                });
                setTransactionType('expenses'); // Default to expense as per user request (Adding debt)
            }
        }
    }, [isOpen, transaction]);

    if (!isOpen || !formData) return null;

    const handleChange = (field: keyof Transaction, value: any) => {
        setFormData(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            onSave(formData, transactionType);
            onClose();
        }
    };

    // Determine correct date field (some use date, some dueDate)
    const dateField = formData.dueDate ? 'dueDate' : 'date';
    const currentDateValue = formData.dueDate || formData.date || '';

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all scale-100">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                            {transaction ? 'Editar' : 'Nova'}
                        </span>
                        <h2 className="text-xl font-black text-slate-900">
                            {transaction ? 'Editar Transação' : 'Adicionar Movimentação'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-800 transition-colors">
                        <X size={24} strokeWidth={3} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto bg-slate-50/50">
                    
                    {/* Transaction Type Toggle */}
                    <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setTransactionType('incomes')}
                            className={`flex-1 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${
                                transactionType === 'incomes' 
                                ? 'bg-emerald-100 text-emerald-700 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            <ArrowUpCircle size={18} strokeWidth={3} /> Receita
                        </button>
                        <button
                            type="button"
                            onClick={() => setTransactionType('expenses')}
                            className={`flex-1 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${
                                transactionType === 'expenses' 
                                ? 'bg-rose-100 text-rose-700 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            <ArrowDownCircle size={18} strokeWidth={3} /> Despesa
                        </button>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 ml-1">
                            <Type size={14} strokeWidth={3} /> Descrição
                        </label>
                        <input 
                            type="text" 
                            required
                            placeholder="Ex: Supermercado, Salário..."
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-extrabold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all shadow-sm placeholder:font-normal"
                        />
                    </div>

                    {/* Amount & Paid Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 ml-1">
                                <DollarSign size={14} strokeWidth={3} /> Valor
                            </label>
                            <input 
                                type="number" 
                                step="0.01"
                                required
                                value={formData.amount || ''}
                                onChange={(e) => handleChange('amount', parseFloat(e.target.value))}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-black focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all shadow-sm"
                            />
                        </div>

                        <div className="space-y-2">
                             <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 ml-1">
                                Status
                            </label>
                            <button
                                type="button"
                                onClick={() => handleChange('paid', !formData.paid)}
                                className={`w-full h-[58px] rounded-2xl font-black flex items-center justify-center gap-2 border transition-all shadow-sm ${
                                    formData.paid 
                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-200' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-gray-50'
                                }`}
                            >
                                {formData.paid ? <Check size={18} strokeWidth={4} /> : null}
                                {formData.paid ? 'PAGO' : 'PENDENTE'}
                            </button>
                        </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 ml-1">
                            <Tag size={14} strokeWidth={3} /> Categoria
                        </label>
                        <div className="relative">
                            <select 
                                value={formData.category}
                                onChange={(e) => handleChange('category', e.target.value)}
                                style={{ paddingLeft: '48px' }}
                                className="w-full appearance-none bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-extrabold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all shadow-sm"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronDown size={20} strokeWidth={3} />
                            </div>
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-600">
                                {getCategoryIcon(formData.category)}
                            </div>
                        </div>
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 ml-1">
                            <Calendar size={14} strokeWidth={3} /> Data / Vencimento
                        </label>
                        <input 
                            type="date" 
                            value={currentDateValue}
                            onChange={(e) => handleChange(dateField, e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-extrabold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="flex-1 py-4 rounded-2xl font-black text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="flex-[2] py-4 rounded-2xl font-black text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95 transform"
                        >
                            <Save size={18} strokeWidth={3} /> Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTransactionModal;