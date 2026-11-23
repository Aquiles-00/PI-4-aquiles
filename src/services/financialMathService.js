/**
 * Motor de Cálculos Financeiros - MP Consultoria
 * Implementa fórmulas de Tabela Price, SAC, Consórcios com Taxa de Administração,
 * Empréstimo Consignado e Antecipação do FGTS.
 */

// Taxas médias de referência praticadas pelo mercado
export const DEFAULT_RATES = {
    FIN_IMOB: {
        annualInterestRate: 0.0999, // 9.99% a.a.
        monthlyInterestRate: Math.pow(1 + 0.0999, 1 / 12) - 1, // ~0.797% a.m.
        maxLtv: 0.80, // até 80% do valor do bem
        maxTermMonths: 420,
        minTermMonths: 12
    },
    FIN_VEIC: {
        annualInterestRate: 0.194, // 19.4% a.a.
        monthlyInterestRate: 0.0149, // 1.49% a.m.
        maxLtv: 1.00, // até 100%
        maxTermMonths: 60,
        minTermMonths: 6
    },
    CONS_IMOB: {
        adminFeeTotal: 0.16, // 16% total no período
        reserveFund: 0.02, // 2% fundo de reserva
        maxTermMonths: 240,
        minTermMonths: 60
    },
    CONS_VEIC: {
        adminFeeTotal: 0.13, // 13% total
        reserveFund: 0.015, // 1.5% fundo de reserva
        maxTermMonths: 84,
        minTermMonths: 24
    },
    CONSIGNADO_INSS: {
        monthlyInterestRate: 0.0166, // 1.66% a.m.
        maxTermMonths: 84,
        marginPercentage: 0.35 // 35% da renda
    },
    CONSIGNADO_PUBLICO: {
        monthlyInterestRate: 0.0155, // 1.55% a.m.
        maxTermMonths: 96,
        marginPercentage: 0.35
    },
    FGTS_ANIVERSARIO: {
        monthlyInterestRate: 0.0179, // 1.79% a.m.
        maxYears: 10
    }
};

/**
 * Calcula a parcela fixa pela Tabela Price
 * PMT = PV * (i * (1+i)^n) / ((1+i)^n - 1)
 */
export function calculatePriceInstallment(principal, monthlyRate, termMonths) {
    if (monthlyRate === 0) return principal / termMonths;
    const factor = Math.pow(1 + monthlyRate, termMonths);
    return principal * ((monthlyRate * factor) / (factor - 1));
}

/**
 * Calcula financiamento pelo Sistema de Amortização Constante (SAC)
 */
export function calculateSAC(principal, monthlyRate, termMonths) {
    const amortization = principal / termMonths;
    const firstInstallment = amortization + (principal * monthlyRate);
    const lastInstallment = amortization + (amortization * monthlyRate);
    
    // Total pago = Soma de n parcelas SAC
    let totalPaid = 0;
    for (let k = 1; k <= termMonths; k++) {
        const balance = principal - (k - 1) * amortization;
        const interest = balance * monthlyRate;
        totalPaid += (amortization + interest);
    }

    return {
        firstInstallment: Number(firstInstallment.toFixed(2)),
        lastInstallment: Number(lastInstallment.toFixed(2)),
        amortization: Number(amortization.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        totalInterest: Number((totalPaid - principal).toFixed(2))
    };
}

/**
 * Simula Financiamento (Imobiliário ou Veicular)
 */
export function simulateFinancing({ serviceType, assetValue, downPayment = 0, termMonths, system = 'PRICE', customRate = null }) {
    const config = DEFAULT_RATES[serviceType] || DEFAULT_RATES.FIN_IMOB;
    const principal = Math.max(0, assetValue - downPayment);
    const months = Math.min(Math.max(Number(termMonths), config.minTermMonths || 12), config.maxTermMonths || 420);
    const monthlyRate = customRate !== null ? customRate : config.monthlyInterestRate;
    const annualRate = config.annualInterestRate || (Math.pow(1 + monthlyRate, 12) - 1);

    if (principal <= 0) {
        throw new Error('O valor financiado (valor do bem menos entrada) deve ser maior que zero.');
    }

    if (system === 'SAC') {
        const sacResult = calculateSAC(principal, monthlyRate, months);
        return {
            serviceType,
            system: 'SAC',
            assetValue: Number(assetValue),
            downPayment: Number(downPayment),
            financedAmount: Number(principal.toFixed(2)),
            termMonths: months,
            monthlyInterestRate: Number((monthlyRate * 100).toFixed(3)),
            annualInterestRate: Number((annualRate * 100).toFixed(2)),
            firstInstallment: sacResult.firstInstallment,
            lastInstallment: sacResult.lastInstallment,
            monthlyInstallment: sacResult.firstInstallment, // referência inicial
            totalInterestOrCost: sacResult.totalInterest,
            totalAmount: sacResult.totalPaid + Number(downPayment),
            downPaymentRequired: serviceType === 'FIN_IMOB' ? assetValue * 0.20 : 0
        };
    }

    // Padrão: Tabela Price
    const monthlyInstallment = calculatePriceInstallment(principal, monthlyRate, months);
    const totalFinancedCost = monthlyInstallment * months;
    const totalInterest = totalFinancedCost - principal;

    return {
        serviceType,
        system: 'PRICE',
        assetValue: Number(assetValue),
        downPayment: Number(downPayment),
        financedAmount: Number(principal.toFixed(2)),
        termMonths: months,
        monthlyInterestRate: Number((monthlyRate * 100).toFixed(3)),
        annualInterestRate: Number((annualRate * 100).toFixed(2)),
        monthlyInstallment: Number(monthlyInstallment.toFixed(2)),
        firstInstallment: Number(monthlyInstallment.toFixed(2)),
        lastInstallment: Number(monthlyInstallment.toFixed(2)),
        totalInterestOrCost: Number(totalInterest.toFixed(2)),
        totalAmount: Number((totalFinancedCost + Number(downPayment)).toFixed(2)),
        downPaymentRequired: serviceType === 'FIN_IMOB' ? assetValue * 0.20 : 0
    };
}

/**
 * Simula Consórcio (Imobiliário ou Veicular)
 * Sem Juros - Apenas Taxa de Administração + Fundo de Reserva
 */
export function simulateConsortium({ serviceType, assetValue, termMonths, bidAmount = 0 }) {
    const config = DEFAULT_RATES[serviceType] || DEFAULT_RATES.CONS_IMOB;
    const months = Math.min(Math.max(Number(termMonths), config.minTermMonths || 24), config.maxTermMonths || 240);
    const totalFeeRate = (config.adminFeeTotal || 0.15) + (config.reserveFund || 0.02);
    
    const totalCost = assetValue * (1 + totalFeeRate);
    const monthlyInstallment = totalCost / months;
    const totalFees = totalCost - assetValue;

    // Cálculo de redução de prazo ou parcela com lance
    let installmentWithBid = monthlyInstallment;
    let monthsWithBid = months;
    if (bidAmount > 0) {
        const remainingCredit = Math.max(0, totalCost - bidAmount);
        installmentWithBid = remainingCredit / months;
        monthsWithBid = Math.ceil(remainingCredit / monthlyInstallment);
    }

    return {
        serviceType,
        system: 'CONSORCIO',
        assetValue: Number(assetValue),
        bidAmount: Number(bidAmount),
        termMonths: months,
        adminFeeRate: Number(((config.adminFeeTotal || 0.15) * 100).toFixed(2)),
        reserveFundRate: Number(((config.reserveFund || 0.02) * 100).toFixed(2)),
        totalFeeRate: Number((totalFeeRate * 100).toFixed(2)),
        monthlyInterestRate: 0,
        annualInterestRate: 0,
        monthlyInstallment: Number(monthlyInstallment.toFixed(2)),
        installmentWithBid: Number(installmentWithBid.toFixed(2)),
        totalInterestOrCost: Number(totalFees.toFixed(2)),
        totalAmount: Number(totalCost.toFixed(2)),
        savingsComparedToFinancing: Number((assetValue * 0.60).toFixed(2)) // Economia média estimada de até 60%
    };
}

/**
 * Simula Empréstimo Consignado (INSS ou Servidor Público)
 */
export function simulatePayrollLoan({ serviceType, loanAmount, termMonths, monthlyIncome = null }) {
    const config = DEFAULT_RATES[serviceType] || DEFAULT_RATES.CONSIGNADO_INSS;
    const months = Math.min(Math.max(Number(termMonths), 6), config.maxTermMonths || 84);
    const monthlyRate = config.monthlyInterestRate;
    
    const monthlyInstallment = calculatePriceInstallment(loanAmount, monthlyRate, months);
    const totalAmount = monthlyInstallment * months;
    const totalInterest = totalAmount - loanAmount;

    let marginAvailable = null;
    let marginStatus = 'NOT_CHECKED';

    if (monthlyIncome && monthlyIncome > 0) {
        marginAvailable = monthlyIncome * config.marginPercentage;
        marginStatus = monthlyInstallment <= marginAvailable ? 'APROVADO_MARGEM' : 'EXCEDE_MARGEM';
    }

    return {
        serviceType,
        loanAmount: Number(loanAmount),
        termMonths: months,
        monthlyInterestRate: Number((monthlyRate * 100).toFixed(2)),
        monthlyInstallment: Number(monthlyInstallment.toFixed(2)),
        totalInterestOrCost: Number(totalInterest.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
        monthlyIncome: monthlyIncome ? Number(monthlyIncome) : null,
        marginAvailable: marginAvailable ? Number(marginAvailable.toFixed(2)) : null,
        marginStatus
    };
}

/**
 * Simula Antecipação de Saque-Aniversário do FGTS
 */
export function simulateFGTSAdvance({ fgtsBalance, yearsToAdvance = 5 }) {
    const years = Math.min(Math.max(Number(yearsToAdvance), 1), 10);
    const rate = DEFAULT_RATES.FGTS_ANIVERSARIO.monthlyInterestRate;

    // Alíquotas e parcelas adicionais da tabela oficial do Saque-Aniversário FGTS
    function getAnnualWithdrawal(balance) {
        if (balance <= 500) return balance * 0.50;
        if (balance <= 1000) return balance * 0.40 + 50;
        if (balance <= 5000) return balance * 0.30 + 150;
        if (balance <= 10000) return balance * 0.20 + 650;
        if (balance <= 15000) return balance * 0.15 + 1150;
        if (balance <= 20000) return balance * 0.10 + 1900;
        return balance * 0.05 + 2900;
    }

    let simulatedBalance = fgtsBalance;
    let totalAnticipated = 0;
    const installments = [];

    for (let y = 1; y <= years; y++) {
        const annualWithdrawal = getAnnualWithdrawal(simulatedBalance);
        if (annualWithdrawal <= 0) break;

        // Valor presente descontado da taxa de juros do período (y * 12 meses)
        const discountFactor = Math.pow(1 + rate, y * 12);
        const presentValue = annualWithdrawal / discountFactor;

        installments.push({
            year: y,
            futureWithdrawalValue: Number(annualWithdrawal.toFixed(2)),
            presentValue: Number(presentValue.toFixed(2))
        });

        totalAnticipated += presentValue;
        simulatedBalance -= annualWithdrawal;
    }

    return {
        serviceType: 'FGTS_ANIVERSARIO',
        fgtsBalance: Number(fgtsBalance),
        yearsToAdvance: years,
        monthlyInterestRate: Number((rate * 100).toFixed(2)),
        totalNetReleased: Number(totalAnticipated.toFixed(2)),
        installments
    };
}
