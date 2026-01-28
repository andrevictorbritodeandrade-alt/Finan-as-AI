import { MonthData, Transaction, Goal } from '../types';
import { PAYMENT_SCHEDULE, INITIAL_ACCOUNTS, MONTH_NAMES } from '../constants';

// Helper to get local data key
export const getStorageKey = (year: number, month: number) => `financeData_${year}_${month}`;

export const getMonthName = (month: number) => MONTH_NAMES[month - 1];

export const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Calculates which installment corresponds to the current view date
function getInstallmentInfo(startYear: number, startMonth: number, total: number, targetYear: number, targetMonth: number) {
    // Calculate difference in months
    const diff = (targetYear - startYear) * 12 + (targetMonth - startMonth);
    const current = diff + 1; // Installments start at 1

    // If current is less than 1 (starts in future) or greater than total (expired), return null
    if (current < 1 || current > total) return null;
    
    return { current, total };
}

// Generates data for ANY month based on configuration templates
export const generateMonthData = (year: number, month: number): MonthData => {
    // Determine reference month for salary (usually pays on prev month reference)
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth === 0) { prevMonth = 12; prevYear = year - 1; }

    const refMonthName = getMonthName(month); // Salario é referente ao mês atual, mas recebido antes
    
    // Pattern: Salary day is based on the PAYMENT_SCHEDULE of the PREVIOUS month. 
    // Example: Viewing Feb (Month 2). prevMonth=1 (Jan). Schedule[1] = '-01-28'. Date = 2026-01-28.
    const salaryDaySuffix = PAYMENT_SCHEDULE[prevMonth] || '-28'; 
    const salaryDate = `${prevYear}${salaryDaySuffix}`;

    // Pattern: Mumbuca day is 15 of CURRENT month.
    const mumbucaDate = `${year}-${month.toString().padStart(2,'0')}-15`;
    
    // Check if it's the initial month (Jan 2026) for "Paid" logic
    const isJan2026 = (year === 2026 && month === 1);
    const isFeb2026 = (year === 2026 && month === 2);

    // Base Incomes
    const newIncomes: Transaction[] = [
        { id: `inc_m_${year}_${month}`, description: `SALARIO MARCELLY`, amount: 3436.22, paid: isJan2026, date: salaryDate, category: 'Salário' },
        { id: `inc_a_${year}_${month}`, description: `SALARIO ANDRE`, amount: 3436.22, paid: isJan2026, date: salaryDate, category: 'Salário' },
        { id: `inc_mum_m_${year}_${month}`, description: 'MUMBUCA MARCELLY', amount: 650.00, paid: isJan2026, date: mumbucaDate, category: 'Mumbuca' },
        { id: `inc_mum_a_${year}_${month}`, description: 'MUMBUCA ANDRE', amount: 650.00, paid: isJan2026, date: mumbucaDate, category: 'Mumbuca' }
    ];

    // --- 13º SALÁRIO LOGIC ---
    if (month === 7) {
        const amount13 = 1718.11; 
        newIncomes.push(
            { id: `inc_13_1_m_${year}`, description: '1ª PARCELA 13º MARCELLY', amount: amount13, paid: false, date: `${prevYear}-06-26`, category: 'Salário' },
            { id: `inc_13_1_a_${year}`, description: '1ª PARCELA 13º ANDRÉ', amount: amount13, paid: false, date: `${prevYear}-06-26`, category: 'Salário' }
        );
    }
    if (month === 1) {
        const amount13_2 = 1500.00; 
        newIncomes.push(
            { id: `inc_13_2_m_${year}`, description: '2ª PARCELA 13º MARCELLY', amount: amount13_2, paid: false, date: `${prevYear}-12-07`, category: 'Salário' },
            { id: `inc_13_2_a_${year}`, description: '2ª PARCELA 13º ANDRÉ', amount: amount13_2, paid: false, date: `${prevYear}-12-07`, category: 'Salário' }
        );
    }

    const newExpenses: Transaction[] = [];

    // List of items paid in Jan 2026
    const paidInJan2026 = ["ALUGUEL", "REMÉDIOS", "PSICÓLOGA", "APPAI", "VIVO", "CLARO", "MULTAS", "RENEGOCIAR", "PASSAGENS", "FACULDADE", "CIDADANIA", "GUARDA ROUPAS", "CELULAR", "CONSERTO", "INTERNET", "INTERMÉDICA", "FATURA"];

    // 1. RECURRING/FIXED EXPENSES
    const cyclicalConfig = [
        { description: "ALUGUEL", amount: 1300.00, category: "Moradia", day: 1 },
        { description: "PSICÓLOGA DA MARCELLY", amount: 280.00, category: "Saúde", day: 10 }, 
        { description: "APPAI DA MARCELLY (MARCIA BISPO)", amount: 110.00, category: "Saúde", day: 23 },
        { description: "APPAI DO ANDRÉ (MARCIA BRITO)", amount: 129.50, category: "Saúde", day: 20 },
        { description: "FATURA DO CARTÃO DO ANDRÉ ITAÚ", amount: 150.00, category: "Outros", day: 24 },
        { description: "INTERNET DA CASA", amount: 125.00, category: "Moradia", day: 18 },
        { description: "INTERMÉDICA DO ANDRÉ (MARCIA BRITO)", amount: 123.00, category: "Saúde", day: 15 },
        { description: "CONTA DA CLARO ANDRÉ", amount: 75.00, category: "Moradia", day: 5 },
        { description: "CONTA DA VIVO ANDRÉ", amount: 110.00, category: "Moradia", day: 5 },
        { description: "SEGURO DO CARRO", amount: 143.00, category: "Transporte", day: 20 },
        { description: "CONTA DA VIVO MARCELLY", amount: 66.60, category: "Moradia", day: 23 }
    ];

    cyclicalConfig.forEach(c => {
        let finalAmount = c.amount;
        let isPaid = false;
        
        if (isFeb2026 && (c.description === "CONTA DA CLARO ANDRÉ" || c.description === "CONTA DA VIVO ANDRÉ")) {
            return; 
        }

        if (isJan2026) {
            if (c.description.includes("ITAÚ")) finalAmount = 56.40;
            if (paidInJan2026.some(p => c.description.toUpperCase().includes(p))) isPaid = true;
        }
        if (isFeb2026) {
            if (c.description.includes("ITAÚ")) finalAmount = 57.00;
        }

        newExpenses.push({
            id: `exp_${year}_${month}_${c.description.replace(/\s/g, '')}`,
            description: c.description,
            amount: finalAmount,
            category: c.category,
            paid: isPaid,
            dueDate: `${year}-${month.toString().padStart(2,'0')}-${c.day.toString().padStart(2,'0')}`,
            group: 'Despesas Fixas'
        });
    });

    // 2. INSTALLMENT EXPENSES
    const finiteConfig = [
        { desc: "GUARDA ROUPAS (MARCIA BRITO)", totalAmount: 914.48, cat: "Moradia", day: 10, installments: 5, sY: 2026, sM: 1 },
        { desc: "CELULAR DA MARCELLY (MARCIA BISPO)", totalAmount: 4628.88, cat: "Outros", day: 10, installments: 12, sY: 2026, sM: 1 },
        { desc: "CONSERTO DO CARRO DE OUTUBRO (MARCIA BRITO)", totalAmount: 1447.00, cat: "Transporte", day: 10, installments: 4, sY: 2025, sM: 11 },
        { desc: "FACULDADE DA MARCELLY (MARCIA BRITO)", totalAmount: 2026.80, cat: "Educação", day: 12, installments: 10, sY: 2025, sM: 11 },
        { desc: "PASSAGENS AÉREAS SP X JOBURG (LILI TORRES)", totalAmount: 4038.96, cat: "Lazer", day: 15, installments: 8, sY: 2025, sM: 12 },
        { desc: "PASSAGENS AÉREAS JOBURG X CAPE TOWN (MARCIA BRITO)", totalAmount: 1560.00, cat: "Lazer", day: 15, installments: 5, sY: 2026, sM: 2 },
        { desc: "ESTADIA DE IDA EM SÃO PAULO (LILI TORRES)", totalAmount: 289.44, cat: "Lazer", day: 15, installments: 4, sY: 2026, sM: 2 },
        { desc: "ESTADIA DE VOLTA SÃO PAULO (LILI TORRES)", totalAmount: 358.20, cat: "Lazer", day: 15, installments: 4, sY: 2026, sM: 2 },
        { desc: "ESTADIA EM CIDADE DO CABO (LILI TORRES)", totalAmount: 1197.00, cat: "Lazer", day: 15, installments: 5, sY: 2026, sM: 2 },
        { desc: "ESTADIA DE JOHANESBURGO (LILI TORRES)", totalAmount: 1363.93, cat: "Lazer", day: 15, installments: 5, sY: 2026, sM: 2 },
        { desc: "CIDADANIA PORTUGUESA (REBECCA BRITO)", totalAmount: 5040.00, cat: "Dívidas", day: 12, installments: 36, sY: 2024, sM: 11 },
        { desc: "PASSAGENS ONIBUS RIO X SP (MARCIA BRITO)", totalAmount: 438.00, cat: "Transporte", day: 15, installments: 5, sY: 2026, sM: 2 },
        { desc: "MALA DO ANDRÉ (MARCIA BRITO)", totalAmount: 179.00, cat: "Lazer", day: 15, installments: 3, sY: 2026, sM: 2 },
        { desc: "RENEGOCIAR CARREFOUR (MARCIA BRITO)", totalAmount: 5000.00, cat: "Dívidas", day: 28, installments: 16, sY: 2025, sM: 11 },
        { desc: "MULTAS", totalAmount: 1040.00, cat: "Transporte", day: 30, installments: 4, sY: 2025, sM: 10 },
        { desc: "EMPRÉSTIMO TIA CÉLIA", totalAmount: 1000.00, cat: "Dívidas", day: 10, installments: 10, sY: 2025, sM: 4 },
        { desc: "EMPRÉSTIMO CONSERTO CELULAR (MARCIA BRITO)", totalAmount: 130.00, cat: "Dívidas", day: 10, installments: 1, sY: 2026, sM: 2 },
        { desc: "DEVOLVER O EMPRÉSTIMO (MARCIA BISPO)", totalAmount: 1000.00, cat: "Dívidas", day: 10, installments: 1, sY: 2026, sM: 2 }
    ];

    finiteConfig.forEach(f => {
        const inst = getInstallmentInfo(f.sY, f.sM, f.installments, year, month);
        if (inst) {
            let isPaid = false;
            if (isJan2026) {
                if (paidInJan2026.some(p => f.desc.toUpperCase().includes(p))) isPaid = true;
            }
            const installmentAmount = f.totalAmount / f.installments;
            newExpenses.push({
                id: `fin_${f.desc.replace(/\s/g,'')}_${inst.current}`,
                description: `${f.desc}`, 
                amount: parseFloat(installmentAmount.toFixed(2)),
                category: f.cat,
                paid: isPaid,
                dueDate: `${year}-${month.toString().padStart(2,'0')}-${f.day.toString().padStart(2,'0')}`,
                installments: inst,
                group: 'Despesas Variáveis'
            });
        }
    });

    const newGoals: Goal[] = [];

    // --- ALGORITMO DE DISTRIBUIÇÃO DE SOBRAS (A PARTIR DE MARÇO 2026) ---
    if (year === 2026 && month >= 3) {
        const salaryOnly = newIncomes.filter(i => i.category === 'Salário').reduce((acc,i) => acc + i.amount, 0);
        const mumbucaOnly = newIncomes.filter(i => i.category === 'Mumbuca').reduce((acc,i) => acc + i.amount, 0);
        const totalCommitted = newExpenses.reduce((acc, e) => acc + e.amount, 0);
        
        const projectedSurplus = (salaryOnly + (mumbucaOnly * 0.92)) - totalCommitted;

        if (projectedSurplus > 100) {
            const valCompras = projectedSurplus * 0.30;
            const valViagem = projectedSurplus * 0.30;
            const valPoupanca = projectedSurplus * 0.20;
            const valDiaDia = projectedSurplus * 0.20;

            const allocations = [
                { id: `alloc_compras_${year}_${month}`, desc: '🛒 COMPRAS DO MÊS (CASA)', amt: valCompras, cat: 'Alimentação' },
                { id: `alloc_viagem_${year}_${month}`, desc: '✈️ FUNDO VIAGEM (PASSAGEM/USO)', amt: valViagem, cat: 'Lazer' },
                { id: `alloc_poupanca_${year}_${month}`, desc: '📈 RESERVA DE POUPANÇA', amt: valPoupanca, cat: 'Investimento' },
                { id: `alloc_diadia_${year}_${month}`, desc: '💵 GIRO DO DIA A DIA (LIVRE)', amt: valDiaDia, cat: 'Outros' }
            ];

            allocations.forEach(alloc => {
                // Add Expense Transaction
                newExpenses.push({
                    id: alloc.id,
                    description: alloc.desc,
                    amount: parseFloat(alloc.amt.toFixed(2)),
                    category: alloc.cat,
                    paid: false,
                    date: `${year}-${month.toString().padStart(2,'0')}-05`,
                    group: 'Distribuição de Sobras (Planejamento)',
                    isDistribution: true // Flag to identify and exclude from Sobras calculation
                });

                // Add corresponding Goal
                newGoals.push({
                    id: `goal_${alloc.id}`,
                    name: alloc.desc,
                    amount: parseFloat(alloc.amt.toFixed(2)),
                    category: alloc.cat,
                    linkedTransactionId: alloc.id
                });
            });
        }
    }

    return {
        incomes: newIncomes,
        expenses: newExpenses,
        shoppingItems: [],
        avulsosItems: [],
        goals: newGoals, // Use the dynamically generated goals
        bankAccounts: INITIAL_ACCOUNTS,
        updatedAt: Date.now()
    };
};