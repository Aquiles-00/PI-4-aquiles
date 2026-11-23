import { db } from '../config/database.js';
import { cleanCPF, formatCPF } from './clientController.js';
import { addProcessEvent } from '../services/notificationService.js';

export const cardController = {
    /**
     * Solicitação e análise de cartão de crédito e abertura de conta
     */
    apply(req, res) {
        try {
            const { cpf, name, email, phone, monthlyIncome, occupation } = req.body;

            if (!cpf || !name) {
                return res.status(400).json({ error: 'CPF e Nome são obrigatórios.' });
            }

            const rawCPF = cleanCPF(cpf);
            const formattedCPF = formatCPF(rawCPF);
            const income = Number(monthlyIncome || 2000);

            // Busca ou cria cliente
            let clientStmt = db.prepare(`
                SELECT * FROM clients 
                WHERE cpf = ? 
                   OR REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = ?
            `);
            let client = clientStmt.get(formattedCPF, rawCPF);

            if (!client) {
                const insertClient = db.prepare(`
                    INSERT INTO clients (cpf, name, email, phone, monthly_income, occupation)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);
                const resClient = insertClient.run(
                    formattedCPF,
                    name,
                    email || '',
                    phone || '',
                    income,
                    occupation || 'Não informado'
                );
                client = { id: resClient.lastInsertRowid, name, cpf: formattedCPF, monthly_income: income };
            }

            // Cálculo do limite pré-aprovado baseado na renda (entre 50% e 150% da renda)
            const creditLimit = Math.max(1200, Math.round(income * 0.70));
            const randomCardDigits = Math.floor(1000 + Math.random() * 9000);
            const maskedCardNumber = `•••• •••• •••• ${randomCardDigits}`;
            const randomAccount = Math.floor(100000 + Math.random() * 900000) + '-0';

            const insertCard = db.prepare(`
                INSERT INTO cards (
                    client_id, card_number_masked, card_brand, card_type, 
                    card_name, credit_limit, available_limit, annual_fee, 
                    cashback_rate, account_number, status
                ) VALUES (?, ?, 'Mastercard Platinum', 'CREDIT', ?, ?, ?, 0.0, 0.015, ?, 'ATIVO')
            `);

            const resCard = insertCard.run(
                client.id,
                maskedCardNumber,
                name.toUpperCase(),
                creditLimit,
                creditLimit,
                randomAccount
            );

            // Cria também um processo de acompanhamento da emissão do cartão
            const randomNum = Math.floor(10000 + Math.random() * 90000);
            const contractNumber = `${randomNum}-CARD`;
            
            const insertProp = db.prepare(`
                INSERT INTO proposals (
                    contract_number, client_id, service_type, title,
                    current_step, step_name, status, status_label,
                    amount, down_payment, term_months, interest_or_admin_rate,
                    monthly_installment, total_amount, amortization_system
                ) VALUES (?, ?, 'CARTAO_CREDITO', 'Cartão Mastercard Platinum + Conta Digital', 2, 'APROVACAO', 'EM_ANDAMENTO', 'Cartão Aprovado', ?, 0, 0, 0, 0, ?, 'CARTAO')
            `);
            const resProp = insertProp.run(contractNumber, client.id, creditLimit, creditLimit);

            addProcessEvent(resProp.lastInsertRowid, {
                title: 'Cartão de Crédito Aprovado',
                description: `Limite aprovado no valor de R$ ${creditLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} com Anuidade Grátis e Cashback de 1.5%.`,
                icon: 'credit_card'
            });

            return res.status(201).json({
                success: true,
                message: 'Cartão e Conta Digital aprovados com sucesso!',
                data: {
                    cardId: resCard.lastInsertRowid,
                    contractNumber,
                    cardNumberMasked: maskedCardNumber,
                    cardBrand: 'Mastercard Platinum',
                    cardHolder: name.toUpperCase(),
                    creditLimit,
                    availableLimit: creditLimit,
                    annualFee: 'Grátis para sempre',
                    cashback: '1.5%',
                    accountNumber: randomAccount,
                    status: 'ATIVO'
                }
            });

        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Lista cartões de um cliente por CPF
     */
    getByCPF(req, res) {
        try {
            const { cpf } = req.params;
            const rawCPF = cleanCPF(cpf);
            const formattedCPF = formatCPF(rawCPF);

            const stmt = db.prepare(`
                SELECT cards.*, clients.name as client_name, clients.cpf as client_cpf
                FROM cards
                JOIN clients ON cards.client_id = clients.id
                WHERE clients.cpf = ? OR REPLACE(REPLACE(REPLACE(clients.cpf, '.', ''), '-', ''), ' ', '') = ?
            `);
            const cards = stmt.all(formattedCPF, rawCPF);

            return res.status(200).json({ success: true, data: cards });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
};
