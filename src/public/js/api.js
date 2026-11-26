/**
 * Cliente API Universal Frontend - MP Consultoria
 * Suporta Modo Híbrido:
 * 1. Conectado: Comunica-se com o backend Node.js / Express (/api)
 * 2. Standalone / Offline: Se executado diretamente como arquivo (file://) ou sem servidor,
 *    executa todos os cálculos matemáticos financeiros e simulações com persistência em localStorage!
 */

// Taxas padrão de referência do mercado
const DEFAULT_RATES = {
    FIN_IMOB: {
        annualInterestRate: 0.0999,
        monthlyInterestRate: Math.pow(1 + 0.0999, 1 / 12) - 1,
        maxLtv: 0.80,
        maxTermMonths: 420,
        minTermMonths: 12
    },
    FIN_VEIC: {
        annualInterestRate: 0.194,
        monthlyInterestRate: 0.0149,
        maxLtv: 1.00,
        maxTermMonths: 60,
        minTermMonths: 6
    },
    CONS_IMOB: {
        adminFeeTotal: 0.16,
        reserveFund: 0.02,
        maxTermMonths: 240,
        minTermMonths: 60
    },
    CONS_VEIC: {
        adminFeeTotal: 0.13,
        reserveFund: 0.015,
        maxTermMonths: 84,
        minTermMonths: 24
    },
    CONSIGNADO_INSS: {
        monthlyInterestRate: 0.0166,
        maxTermMonths: 84,
        marginPercentage: 0.35
    },
    CONSIGNADO_PUBLICO: {
        monthlyInterestRate: 0.0155,
        maxTermMonths: 96,
        marginPercentage: 0.35
    },
    FGTS_ANIVERSARIO: {
        monthlyInterestRate: 0.0179,
        maxYears: 10
    }
};

// Motor de Cálculo Financeiro Embutido (Offline)
function calculatePriceInstallment(principal, monthlyRate, termMonths) {
    if (monthlyRate === 0) return principal / termMonths;
    const factor = Math.pow(1 + monthlyRate, termMonths);
    return principal * ((monthlyRate * factor) / (factor - 1));
}

function calculateSAC(principal, monthlyRate, termMonths) {
    const amortization = principal / termMonths;
    const firstInstallment = amortization + (principal * monthlyRate);
    const lastInstallment = amortization + (amortization * monthlyRate);
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

function offlineSimulate(payload) {
    const { serviceType = 'FIN_IMOB', assetValue = 0, downPayment = 0, termMonths = 120, system = 'PRICE', loanAmount = 0, monthlyIncome = null, fgtsBalance = 0, yearsToAdvance = 5 } = payload;
    const val = Number(assetValue || loanAmount || fgtsBalance || 0);
    const months = Number(termMonths || 60);

    if (serviceType === 'FIN_IMOB' || serviceType === 'FIN_VEIC') {
        const config = DEFAULT_RATES[serviceType];
        const principal = Math.max(0, val - Number(downPayment || 0));
        const monthlyRate = config.monthlyInterestRate;
        const annualRate = config.annualInterestRate;

        if (system === 'SAC') {
            const sac = calculateSAC(principal, monthlyRate, months);
            return {
                serviceType,
                system: 'SAC',
                assetValue: val,
                downPayment: Number(downPayment || 0),
                financedAmount: Number(principal.toFixed(2)),
                termMonths: months,
                monthlyInterestRate: Number((monthlyRate * 100).toFixed(3)),
                annualInterestRate: Number((annualRate * 100).toFixed(2)),
                firstInstallment: sac.firstInstallment,
                lastInstallment: sac.lastInstallment,
                monthlyInstallment: sac.firstInstallment,
                totalInterestOrCost: sac.totalInterest,
                totalAmount: sac.totalPaid + Number(downPayment || 0),
                downPaymentRequired: serviceType === 'FIN_IMOB' ? val * 0.20 : 0
            };
        }

        const monthlyInstallment = calculatePriceInstallment(principal, monthlyRate, months);
        const totalFinancedCost = monthlyInstallment * months;
        return {
            serviceType,
            system: 'PRICE',
            assetValue: val,
            downPayment: Number(downPayment || 0),
            financedAmount: Number(principal.toFixed(2)),
            termMonths: months,
            monthlyInterestRate: Number((monthlyRate * 100).toFixed(3)),
            annualInterestRate: Number((annualRate * 100).toFixed(2)),
            monthlyInstallment: Number(monthlyInstallment.toFixed(2)),
            firstInstallment: Number(monthlyInstallment.toFixed(2)),
            lastInstallment: Number(monthlyInstallment.toFixed(2)),
            totalInterestOrCost: Number((totalFinancedCost - principal).toFixed(2)),
            totalAmount: Number((totalFinancedCost + Number(downPayment || 0)).toFixed(2)),
            downPaymentRequired: serviceType === 'FIN_IMOB' ? val * 0.20 : 0
        };
    }

    if (serviceType === 'CONS_IMOB' || serviceType === 'CONS_VEIC') {
        const config = DEFAULT_RATES[serviceType];
        const totalFeeRate = (config.adminFeeTotal || 0.15) + (config.reserveFund || 0.02);
        const totalCost = val * (1 + totalFeeRate);
        const monthlyInstallment = totalCost / months;
        return {
            serviceType,
            system: 'CONSORCIO',
            assetValue: val,
            bidAmount: 0,
            termMonths: months,
            adminFeeRate: Number(((config.adminFeeTotal || 0.15) * 100).toFixed(2)),
            reserveFundRate: Number(((config.reserveFund || 0.02) * 100).toFixed(2)),
            totalFeeRate: Number((totalFeeRate * 100).toFixed(2)),
            monthlyInterestRate: 0,
            annualInterestRate: 0,
            monthlyInstallment: Number(monthlyInstallment.toFixed(2)),
            installmentWithBid: Number(monthlyInstallment.toFixed(2)),
            totalInterestOrCost: Number((totalCost - val).toFixed(2)),
            totalAmount: Number(totalCost.toFixed(2)),
            savingsComparedToFinancing: Number((val * 0.60).toFixed(2))
        };
    }

    if (serviceType === 'CONSIGNADO_INSS' || serviceType === 'CONSIGNADO_PUBLICO') {
        const config = DEFAULT_RATES[serviceType];
        const monthlyRate = config.monthlyInterestRate;
        const monthlyInstallment = calculatePriceInstallment(val, monthlyRate, months);
        const totalAmount = monthlyInstallment * months;
        let marginAvailable = null;
        let marginStatus = 'NOT_CHECKED';
        if (monthlyIncome && monthlyIncome > 0) {
            marginAvailable = monthlyIncome * config.marginPercentage;
            marginStatus = monthlyInstallment <= marginAvailable ? 'APROVADO_MARGEM' : 'EXCEDE_MARGEM';
        }
        return {
            serviceType,
            loanAmount: val,
            termMonths: months,
            monthlyInterestRate: Number((monthlyRate * 100).toFixed(2)),
            monthlyInstallment: Number(monthlyInstallment.toFixed(2)),
            totalInterestOrCost: Number((totalAmount - val).toFixed(2)),
            totalAmount: Number(totalAmount.toFixed(2)),
            monthlyIncome: monthlyIncome ? Number(monthlyIncome) : null,
            marginAvailable: marginAvailable ? Number(marginAvailable.toFixed(2)) : null,
            marginStatus
        };
    }

    if (serviceType === 'FGTS_ANIVERSARIO') {
        const rate = DEFAULT_RATES.FGTS_ANIVERSARIO.monthlyInterestRate;
        function getAnnualWithdrawal(b) {
            if (b <= 500) return b * 0.50;
            if (b <= 1000) return b * 0.40 + 50;
            if (b <= 5000) return b * 0.30 + 150;
            if (b <= 10000) return b * 0.20 + 650;
            if (b <= 15000) return b * 0.15 + 1150;
            if (b <= 20000) return b * 0.10 + 1900;
            return b * 0.05 + 2900;
        }
        let simBalance = val;
        let totalAnticipated = 0;
        const installments = [];
        for (let y = 1; y <= Number(yearsToAdvance || 5); y++) {
            const annual = getAnnualWithdrawal(simBalance);
            if (annual <= 0) break;
            const discountFactor = Math.pow(1 + rate, y * 12);
            const presentValue = annual / discountFactor;
            installments.push({
                year: y,
                futureWithdrawalValue: Number(annual.toFixed(2)),
                presentValue: Number(presentValue.toFixed(2))
            });
            totalAnticipated += presentValue;
            simBalance -= annual;
        }
        return {
            serviceType: 'FGTS_ANIVERSARIO',
            fgtsBalance: val,
            yearsToAdvance: Number(yearsToAdvance || 5),
            monthlyInterestRate: Number((rate * 100).toFixed(2)),
            totalNetReleased: Number(totalAnticipated.toFixed(2)),
            installments
        };
    }

    return { error: 'Modalidade desconhecida' };
}

// Inicialização do Banco de Dados Offline (LocalStorage)
const STORAGE_KEY = 'mp_consultoria_offline_db_v1';

function getOfflineDB() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) return JSON.parse(data);
    } catch (e) {}

    // Seed inicial padrão offline
    const initialDB = {
        clients: [
            {
                id: 1,
                cpf: '123.456.789-00',
                name: 'João Silva',
                email: 'joao.silva@email.com',
                phone: '(11) 98765-4321',
                monthlyIncome: 8500.00,
                occupation: 'Engenheiro de Software',
                avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
                createdAt: '2026-08-01 10:00:00'
            },
            {
                id: 2,
                cpf: '234.567.890-11',
                name: 'Maria Aparecida Souza',
                email: 'maria.souza@email.com',
                phone: '(11) 97654-3210',
                monthlyIncome: 4200.00,
                occupation: 'Aposentada INSS',
                avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
                createdAt: '2026-08-05 14:30:00'
            },
            {
                id: 3,
                cpf: '345.678.901-22',
                name: 'Carlos Eduardo Mendes',
                email: 'carlos.mendes@email.com',
                phone: '(21) 99887-1122',
                monthlyIncome: 12000.00,
                occupation: 'Empresário',
                avatarUrl: '',
                createdAt: '2026-08-10 09:15:00'
            }
        ],
        proposals: [
            {
                id: 1,
                contract_number: '49281-IMOB',
                client_id: 1,
                service_type: 'FIN_IMOB',
                title: 'Financiamento Imobiliário',
                current_step: 3,
                step_name: 'ASSINATURA',
                status: 'EM_ANDAMENTO',
                status_label: 'Em Andamento',
                amount: 380000.00,
                down_payment: 95000.00,
                term_months: 360,
                interest_or_admin_rate: 9.99,
                monthly_installment: 2780.45,
                total_amount: 995962.00,
                amortization_system: 'PRICE',
                events: [
                    { id: 1, proposal_id: 1, title: 'Contratos Gerados', description: 'Os contratos foram emitidos e enviados para sua área de assinatura digital.', icon: 'drafts', event_time: '2026-08-15 10:45:00' },
                    { id: 2, proposal_id: 1, title: 'Crédito Aprovado', description: 'Análise de crédito concluída com sucesso pelo banco emissor.', icon: 'check_circle', event_time: '2026-08-14 16:30:00' },
                    { id: 3, proposal_id: 1, title: 'Avaliação do Imóvel Aprovada', description: 'Laudo técnico de engenharia aprovado pela instituição financeira.', icon: 'real_estate_agent', event_time: '2026-08-12 14:00:00' }
                ]
            },
            {
                id: 2,
                contract_number: '8832-FGTS',
                client_id: 1,
                service_type: 'FGTS_ANIVERSARIO',
                title: 'Empréstimo Saque-Aniversário FGTS',
                current_step: 1,
                step_name: 'ANALISE',
                status: 'EM_ANDAMENTO',
                status_label: 'Análise Inicial',
                amount: 14500.00,
                down_payment: 0.00,
                term_months: 60,
                interest_or_admin_rate: 1.79,
                monthly_installment: 0.00,
                total_amount: 14500.00,
                amortization_system: 'FGTS',
                events: [
                    { id: 4, proposal_id: 2, title: 'Documentação Recebida', description: 'Todos os documentos necessários foram anexados ao processo de antecipação.', icon: 'upload_file', event_time: '2026-08-15 09:15:00' },
                    { id: 5, proposal_id: 2, title: 'Consulta de Saldo FGTS', description: 'Saldo de R$ 18.250,00 verificado e reservado junto à Caixa Econômica.', icon: 'savings', event_time: '2026-08-15 09:10:00' }
                ]
            },
            {
                id: 3,
                contract_number: '77123-INSS',
                client_id: 2,
                service_type: 'CONSIGNADO_INSS',
                title: 'Empréstimo Consignado INSS',
                current_step: 4,
                step_name: 'LIBERACAO',
                status: 'CONCLUIDO',
                status_label: 'Crédito Liberado',
                amount: 22000.00,
                down_payment: 0.00,
                term_months: 84,
                interest_or_admin_rate: 1.66,
                monthly_installment: 485.30,
                total_amount: 40765.20,
                amortization_system: 'PRICE',
                events: [
                    { id: 6, proposal_id: 3, title: 'Recurso Creditado', description: 'Valor de R$ 22.000,00 depositado com sucesso via TED na conta do cliente.', icon: 'account_balance_wallet', event_time: '2026-08-10 11:30:00' }
                ]
            },
            {
                id: 4,
                contract_number: '99412-CONS',
                client_id: 3,
                service_type: 'CONS_IMOB',
                title: 'Consórcio de Imóvel',
                current_step: 2,
                step_name: 'APROVACAO',
                status: 'EM_ANDAMENTO',
                status_label: 'Cota Ativada',
                amount: 500000.00,
                down_payment: 0.00,
                term_months: 240,
                interest_or_admin_rate: 18.00,
                monthly_installment: 2458.33,
                total_amount: 590000.00,
                amortization_system: 'CONSORCIO',
                events: [
                    { id: 7, proposal_id: 4, title: 'Cota Contemplável Criada', description: 'Grupo 410, Cota 291 emitida com sucesso na administradora.', icon: 'verified', event_time: '2026-08-10 11:00:00' }
                ]
            }
        ],
        cards: [
            {
                id: 1,
                client_id: 1,
                card_number_masked: '•••• •••• •••• 4589',
                card_brand: 'Mastercard Platinum',
                card_type: 'CREDIT',
                card_name: 'JOAO SILVA',
                credit_limit: 12000.00,
                available_limit: 9450.00,
                annual_fee: 0.00,
                cashback_rate: 0.015,
                account_number: '482910-4',
                status: 'ATIVO'
            }
        ],
        leads: []
    };

    saveOfflineDB(initialDB);
    return initialDB;
}

function saveOfflineDB(db) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {}
}

function cleanCPF(cpf) {
    return String(cpf || '').replace(/\D/g, '');
}

function isOfflineMode() {
    return window.location.protocol === 'file:' || !navigator.onLine;
}

const API_BASE = '/api';

const api = {
    // Simulações Financeiras
    async calculateSimulation(payload) {
        if (!isOfflineMode()) {
            try {
                const res = await fetch(`${API_BASE}/simulations/calculate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) return await res.json();
            } catch (err) {
                console.log('📡 Servidor não detectado. Usando motor financeiro offline...');
            }
        }
        // Fallback Offline
        const result = offlineSimulate(payload);
        return { success: !result.error, data: result, error: result.error };
    },

    // Busca de Cliente por CPF
    async searchClientByCPF(cpf) {
        if (!isOfflineMode()) {
            try {
                const res = await fetch(`${API_BASE}/clients/search?cpf=${encodeURIComponent(cpf)}`);
                if (res.ok) return await res.json();
            } catch (err) {
                console.log('📡 Servidor não detectado. Buscando na base local offline...');
            }
        }
        // Fallback Offline
        const db = getOfflineDB();
        const raw = cleanCPF(cpf);
        const client = db.clients.find(c => cleanCPF(c.cpf) === raw);

        if (!client) {
            return { error: 'Cliente não localizado para o CPF informado.', searchedCPF: cpf };
        }

        const proposals = db.proposals.filter(p => p.client_id === client.id);
        const cards = db.cards.filter(c => c.client_id === client.id);
        const recentHistory = [];
        proposals.forEach(p => {
            (p.events || []).forEach(ev => {
                recentHistory.push({
                    ...ev,
                    proposal_title: p.title,
                    contract_number: p.contract_number
                });
            });
        });
        recentHistory.sort((a, b) => b.id - a.id);

        return {
            success: true,
            data: {
                client,
                proposals,
                cards,
                recentHistory: recentHistory.slice(0, 5)
            }
        };
    },

    // Detalhes de Processo / Contrato
    async getProcessByContract(contractNumber) {
        if (!isOfflineMode()) {
            try {
                const res = await fetch(`${API_BASE}/processes/contract/${encodeURIComponent(contractNumber)}`);
                if (res.ok) return await res.json();
            } catch (err) {}
        }
        const db = getOfflineDB();
        const proposal = db.proposals.find(p => p.contract_number === contractNumber);
        if (!proposal) return { error: 'Processo não encontrado' };
        const client = db.clients.find(c => c.id === proposal.client_id);
        return { success: true, data: { ...proposal, client } };
    },

    // Criação de Proposta
    async createProposal(payload) {
        if (!isOfflineMode()) {
            try {
                const res = await fetch(`${API_BASE}/proposals`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) return await res.json();
            } catch (err) {}
        }
        // Fallback Offline
        const db = getOfflineDB();
        const clean = cleanCPF(payload.cpf);
        let client = db.clients.find(c => cleanCPF(c.cpf) === clean);
        if (!client) {
            client = {
                id: db.clients.length + 1,
                cpf: payload.cpf,
                name: payload.name || 'Cliente Novo',
                email: payload.email || '',
                phone: payload.phone || '',
                monthlyIncome: Number(payload.monthlyIncome || 0),
                occupation: payload.occupation || '',
                avatarUrl: '',
                createdAt: new Date().toISOString()
            };
            db.clients.push(client);
        }

        const contractNum = Math.floor(10000 + Math.random() * 90000) + '-' + (payload.serviceType ? payload.serviceType.split('_')[1] || 'FIN' : 'PROP');
        const newProposal = {
            id: db.proposals.length + 1,
            contract_number: contractNum,
            client_id: client.id,
            service_type: payload.serviceType,
            title: payload.title || 'Proposta de Crédito',
            current_step: 1,
            step_name: 'ANALISE',
            status: 'EM_ANDAMENTO',
            status_label: 'Em Análise',
            amount: Number(payload.amount || payload.assetValue || 0),
            down_payment: Number(payload.downPayment || 0),
            term_months: Number(payload.termMonths || 60),
            interest_or_admin_rate: Number(payload.interestRate || 1.5),
            monthly_installment: Number(payload.monthlyInstallment || 0),
            total_amount: Number(payload.totalAmount || payload.amount || 0),
            amortization_system: payload.amortizationSystem || 'PRICE',
            events: [
                {
                    id: Date.now(),
                    proposal_id: db.proposals.length + 1,
                    title: 'Proposta Cadastrada',
                    description: 'Solicitação registrada com sucesso pelo portal.',
                    icon: 'description',
                    event_time: new Date().toLocaleString('pt-BR')
                }
            ]
        };

        db.proposals.push(newProposal);
        saveOfflineDB(db);

        return {
            success: true,
            message: 'Proposta gerada com sucesso!',
            data: {
                proposalId: newProposal.id,
                contractNumber: newProposal.contract_number,
                clientId: client.id
            }
        };
    },

    // Solicitação de Cartão
    async applyCard(payload) {
        if (!isOfflineMode()) {
            try {
                const res = await fetch(`${API_BASE}/cards/apply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) return await res.json();
            } catch (err) {}
        }
        const db = getOfflineDB();
        const clean = cleanCPF(payload.cpf);
        let client = db.clients.find(c => cleanCPF(c.cpf) === clean);
        if (!client) {
            client = {
                id: db.clients.length + 1,
                cpf: payload.cpf,
                name: payload.name || 'Cliente Cartão',
                email: payload.email || '',
                phone: payload.phone || '',
                monthlyIncome: Number(payload.monthlyIncome || 0),
                occupation: payload.occupation || '',
                avatarUrl: '',
                createdAt: new Date().toISOString()
            };
            db.clients.push(client);
        }

        const randomLast4 = Math.floor(1000 + Math.random() * 9000);
        const limit = Number(payload.monthlyIncome || 4000) * 1.5;
        const newCard = {
            id: db.cards.length + 1,
            client_id: client.id,
            card_number_masked: `•••• •••• •••• ${randomLast4}`,
            card_brand: payload.cardBrand || 'Mastercard Black',
            card_type: payload.cardType || 'CREDIT',
            card_name: (payload.name || client.name).toUpperCase(),
            credit_limit: limit,
            available_limit: limit,
            annual_fee: 0.00,
            cashback_rate: 0.015,
            account_number: `${Math.floor(100000 + Math.random() * 900000)}-${Math.floor(Math.random() * 9)}`,
            status: 'ATIVO'
        };

        db.cards.push(newCard);
        saveOfflineDB(db);

        return {
            success: true,
            message: 'Cartão aprovado com sucesso!',
            data: {
                cardId: newCard.id,
                cardNumberMasked: newCard.card_number_masked,
                creditLimit: newCard.credit_limit,
                accountNumber: newCard.account_number
            }
        };
    },

    // Envio de Lead / Formulário de Contato
    async sendLead(payload) {
        if (!isOfflineMode()) {
            try {
                const res = await fetch(`${API_BASE}/leads`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) return await res.json();
            } catch (err) {}
        }
        const db = getOfflineDB();
        db.leads.push({
            ...payload,
            id: db.leads.length + 1,
            createdAt: new Date().toISOString()
        });
        saveOfflineDB(db);
        return { success: true, message: 'Solicitação de contato recebida com sucesso!' };
    }
};

// Notificação toast elegante
function showToast(message, type = 'success') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    const bgColors = {
        success: 'bg-[#006c49] text-white',
        error: 'bg-[#ba1a1a] text-white',
        info: 'bg-[#131b2e] text-white'
    };

    toast.className = `${bgColors[type] || bgColors.info} px-6 py-3.5 rounded-xl shadow-lg font-label-md text-sm flex items-center gap-3 transition-all duration-300 transform translate-y-4 opacity-0 pointer-events-auto border border-white/10`;
    
    const iconName = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
    toast.innerHTML = `
        <span class="material-symbols-outlined text-[20px]">${iconName}</span>
        <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-4', 'opacity-0');
    });

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Vincula globalmente para scripts não-módulos e compatibilidade em qualquer navegador
if (typeof window !== 'undefined') {
    window.api = api;
    window.showToast = showToast;
}
