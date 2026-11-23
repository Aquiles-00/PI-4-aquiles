import { db } from '../config/database.js';

export const leadController = {
    /**
     * Cria um novo lead / contato ("Falar com Consultor")
     */
    create(req, res) {
        try {
            const { name, email, phone, serviceInterest, message, simulationId } = req.body;

            if (!name || !phone) {
                return res.status(400).json({ error: 'Nome e Telefone/WhatsApp são obrigatórios.' });
            }

            const insertStmt = db.prepare(`
                INSERT INTO leads (name, email, phone, service_interest, message, simulation_id, status)
                VALUES (?, ?, ?, ?, ?, ?, 'NOVO')
            `);

            const result = insertStmt.run(
                name,
                email || '',
                phone,
                serviceInterest || 'Geral',
                message || 'Solicitação de contato com consultor.',
                simulationId ? Number(simulationId) : null
            );

            return res.status(201).json({
                success: true,
                message: 'Contato recebido com sucesso! Um consultor entrará em contato em breve.',
                data: {
                    leadId: result.lastInsertRowid,
                    name,
                    phone,
                    serviceInterest: serviceInterest || 'Geral',
                    status: 'NOVO'
                }
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Lista todos os leads captados
     */
    getAll(req, res) {
        try {
            const stmt = db.prepare(`
                SELECT l.*, s.service_type as sim_service_type, s.asset_value as sim_asset_value, s.monthly_installment as sim_installment
                FROM leads l
                LEFT JOIN simulations s ON l.simulation_id = s.id
                ORDER BY l.id DESC
            `);
            const leads = stmt.all();

            return res.status(200).json({ success: true, count: leads.length, data: leads });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
};
