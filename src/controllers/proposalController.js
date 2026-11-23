import { db } from '../config/database.js';
import { addProcessEvent } from '../services/notificationService.js';
import { 
    simulateFinancing, 
    simulateConsortium, 
    simulatePayrollLoan, 
    simulateFGTSAdvance 
} from '../services/financialMathService.js';
import { cleanCPF, formatCPF } from './clientController.js';

export const proposalController = {
    /**
     * Lista todas as propostas (visão backoffice / correspondente)
     */
    getAll(req, res) {
        try {
            const { status, serviceType } = req.query;
            let query = `
                SELECT p.*, c.name as client_name, c.cpf as client_cpf, c.phone as client_phone
                FROM proposals p
                JOIN clients c ON p.client_id = c.id
            `;
            const params = [];
            const conditions = [];

            if (status) {
                conditions.push('p.status = ?');
                params.push(status);
            }

            if (serviceType) {
                conditions.push('p.service_type = ?');
                params.push(serviceType);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY p.id DESC';

            const stmt = db.prepare(query);
            const proposals = stmt.all(...params);

            return res.status(200).json({ success: true, count: proposals.length, data: proposals });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Cria uma nova proposta de crédito/serviço
     */
    create(req, res) {
        try {
            const {
                cpf,
                clientName,
                email,
                phone,
                serviceType,
                title,
                amount,
                downPayment = 0,
                termMonths = 60,
                system = 'PRICE'
            } = req.body;

            if (!cpf || !serviceType || !amount) {
                return res.status(400).json({ error: 'Campos obrigatórios: cpf, serviceType, amount.' });
            }

            const rawCPF = cleanCPF(cpf);
            const formattedCPF = formatCPF(rawCPF);

            // 1. Busca ou cria cliente automaticamente
            let clientStmt = db.prepare(`
                SELECT * FROM clients 
                WHERE cpf = ? 
                   OR REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = ?
            `);
            let client = clientStmt.get(formattedCPF, rawCPF);

            if (!client) {
                const insertClient = db.prepare(`
                    INSERT INTO clients (cpf, name, email, phone)
                    VALUES (?, ?, ?, ?)
                `);
                const resClient = insertClient.run(
                    formattedCPF,
                    clientName || 'Cliente ' + rawCPF.slice(-4),
                    email || '',
                    phone || ''
                );
                client = { id: resClient.lastInsertRowid, name: clientName, cpf: formattedCPF };
            }

            // 2. Realiza o cálculo financeiro para os valores da proposta
            let calcResult;
            const sType = serviceType.toUpperCase();

            if (sType.startsWith('FIN_')) {
                calcResult = simulateFinancing({
                    serviceType: sType,
                    assetValue: Number(amount),
                    downPayment: Number(downPayment),
                    termMonths: Number(termMonths),
                    system
                });
            } else if (sType.startsWith('CONS_')) {
                calcResult = simulateConsortium({
                    serviceType: sType,
                    assetValue: Number(amount),
                    termMonths: Number(termMonths)
                });
            } else if (sType.startsWith('CONSIGNADO_')) {
                calcResult = simulatePayrollLoan({
                    serviceType: sType,
                    loanAmount: Number(amount),
                    termMonths: Number(termMonths)
                });
            } else if (sType === 'FGTS_ANIVERSARIO') {
                calcResult = simulateFGTSAdvance({
                    fgtsBalance: Number(amount),
                    yearsToAdvance: Math.min(Math.ceil(termMonths / 12), 10)
                });
            } else {
                calcResult = {
                    monthlyInstallment: Number(amount) / Number(termMonths),
                    totalAmount: Number(amount),
                    monthlyInterestRate: 0
                };
            }

            // 3. Gera número de contrato amigável e único
            const suffixMap = {
                FIN_IMOB: 'IMOB',
                FIN_VEIC: 'AUTO',
                CONS_IMOB: 'CONS',
                CONS_VEIC: 'CONS',
                CONSIGNADO_INSS: 'INSS',
                CONSIGNADO_PUBLICO: 'SIAPE',
                FGTS_ANIVERSARIO: 'FGTS',
                CARTAO_CREDITO: 'CARD'
            };
            const suffix = suffixMap[sType] || 'PROP';
            const randomNum = Math.floor(10000 + Math.random() * 90000);
            const contractNumber = `${randomNum}-${suffix}`;

            // Título descritivo amigável
            const defaultTitles = {
                FIN_IMOB: 'Financiamento Imobiliário',
                FIN_VEIC: 'Financiamento de Veículo',
                CONS_IMOB: 'Consórcio Imobiliário',
                CONS_VEIC: 'Consórcio de Veículo',
                CONSIGNADO_INSS: 'Empréstimo Consignado INSS',
                CONSIGNADO_PUBLICO: 'Consignado Servidor Público',
                FGTS_ANIVERSARIO: 'Empréstimo Saque-Aniversário FGTS',
                CARTAO_CREDITO: 'Cartão de Crédito e Conta Digital'
            };
            const proposalTitle = title || defaultTitles[sType] || 'Proposta de Crédito';

            // 4. Salva a proposta
            const insertProp = db.prepare(`
                INSERT INTO proposals (
                    contract_number, client_id, service_type, title,
                    current_step, step_name, status, status_label,
                    amount, down_payment, term_months, interest_or_admin_rate,
                    monthly_installment, total_amount, amortization_system
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const resProp = insertProp.run(
                contractNumber,
                client.id,
                sType,
                proposalTitle,
                1,
                'ANALISE',
                'EM_ANDAMENTO',
                'Análise Inicial',
                Number(amount),
                Number(downPayment),
                Number(termMonths),
                calcResult.monthlyInterestRate || calcResult.adminFeeRate || 0,
                calcResult.monthlyInstallment || calcResult.totalNetReleased || 0,
                calcResult.totalAmount || calcResult.totalNetReleased || Number(amount),
                calcResult.system || 'PRICE'
            );

            const proposalId = resProp.lastInsertRowid;

            // 5. Adiciona evento de criação na linha do tempo
            addProcessEvent(proposalId, {
                title: 'Proposta Recebida',
                description: `Proposta no valor de R$ ${Number(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} registrada e enviada para análise cadastral.`,
                icon: 'upload_file'
            });

            return res.status(201).json({
                success: true,
                message: 'Proposta cadastrada com sucesso!',
                data: {
                    id: proposalId,
                    contractNumber,
                    clientId: client.id,
                    serviceType: sType,
                    title: proposalTitle,
                    currentStep: 1,
                    stepName: 'ANALISE',
                    status: 'EM_ANDAMENTO',
                    amount: Number(amount),
                    monthlyInstallment: calcResult.monthlyInstallment || 0,
                    totalAmount: calcResult.totalAmount || Number(amount)
                }
            });

        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
};
