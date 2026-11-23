import { db } from '../config/database.js';

// Função utilitária para limpar pontuações de CPF
export function cleanCPF(cpf) {
    if (!cpf) return '';
    return String(cpf).replace(/\D/g, '');
}

// Função para formatar CPF para exibição padrão (000.000.000-00)
export function formatCPF(cpf) {
    const cleaned = cleanCPF(cpf);
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export const clientController = {
    /**
     * Busca cliente por CPF e retorna processos e cartões vinculados
     */
    searchByCPF(req, res) {
        try {
            const { cpf } = req.query;
            if (!cpf) {
                return res.status(400).json({ error: 'O parâmetro CPF é obrigatório na query (?cpf=...).' });
            }

            const rawCPF = cleanCPF(cpf);
            const formattedCPF = formatCPF(rawCPF);

            // Busca pelo CPF com pontuação ou apenas números
            const clientStmt = db.prepare(`
                SELECT * FROM clients 
                WHERE REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = ?
                   OR cpf = ?
            `);
            const client = clientStmt.get(rawCPF, cpf);

            if (!client) {
                return res.status(404).json({ 
                    error: 'Cliente não localizado para o CPF informado.',
                    searchedCPF: cpf
                });
            }

            // Busca os processos do cliente
            const proposalsStmt = db.prepare(`
                SELECT * FROM proposals 
                WHERE client_id = ? 
                ORDER BY id DESC
            `);
            const proposals = proposalsStmt.all(client.id);

            // Para cada processo, busca a lista de eventos
            const eventsStmt = db.prepare(`
                SELECT * FROM process_events 
                WHERE proposal_id = ? 
                ORDER BY id DESC
            `);

            const proposalsWithEvents = proposals.map(prop => ({
                ...prop,
                events: eventsStmt.all(prop.id)
            }));

            // Busca cartões do cliente
            const cardsStmt = db.prepare(`
                SELECT * FROM cards 
                WHERE client_id = ?
            `);
            const cards = cardsStmt.all(client.id);

            // Histórico recente consolidado do cliente
            const historyStmt = db.prepare(`
                SELECT pe.*, p.title as proposal_title, p.contract_number 
                FROM process_events pe
                JOIN proposals p ON pe.proposal_id = p.id
                WHERE p.client_id = ?
                ORDER BY pe.id DESC
                LIMIT 5
            `);
            const recentHistory = historyStmt.all(client.id);

            return res.status(200).json({
                success: true,
                data: {
                    client: {
                        id: client.id,
                        name: client.name,
                        cpf: client.cpf,
                        email: client.email,
                        phone: client.phone,
                        monthlyIncome: client.monthly_income,
                        occupation: client.occupation,
                        avatarUrl: client.avatar_url,
                        createdAt: client.created_at
                    },
                    proposals: proposalsWithEvents,
                    cards,
                    recentHistory
                }
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Lista todos os clientes
     */
    getAll(req, res) {
        try {
            const stmt = db.prepare('SELECT * FROM clients ORDER BY id DESC');
            const clients = stmt.all();
            return res.status(200).json({ success: true, data: clients });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Cria ou atualiza um cliente
     */
    create(req, res) {
        try {
            const { cpf, name, email, phone, monthlyIncome = 0, occupation = '', avatarUrl = '' } = req.body;
            if (!cpf || !name) {
                return res.status(400).json({ error: 'Campos CPF e Nome são obrigatórios.' });
            }

            const clean = cleanCPF(cpf);
            const formatted = formatCPF(clean);

            const checkStmt = db.prepare('SELECT * FROM clients WHERE cpf = ? OR cpf = ?');
            const existing = checkStmt.get(clean, formatted);

            if (existing) {
                return res.status(409).json({ 
                    error: 'Já existe um cliente cadastrado com este CPF.', 
                    clientId: existing.id 
                });
            }

            const insertStmt = db.prepare(`
                INSERT INTO clients (cpf, name, email, phone, monthly_income, occupation, avatar_url)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const result = insertStmt.run(
                formatted,
                name,
                email || '',
                phone || '',
                Number(monthlyIncome),
                occupation,
                avatarUrl
            );

            return res.status(201).json({
                success: true,
                message: 'Cliente cadastrado com sucesso!',
                data: {
                    id: result.lastInsertRowid,
                    cpf: formatted,
                    name,
                    email,
                    phone
                }
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
};
