import { db } from '../config/database.js';
import { updateProposalStep, addProcessEvent } from '../services/notificationService.js';

export const processController = {
    /**
     * Busca processo por ID
     */
    getById(req, res) {
        try {
            const { id } = req.params;
            const stmt = db.prepare(`
                SELECT p.*, c.name as client_name, c.cpf as client_cpf, c.email as client_email, c.phone as client_phone
                FROM proposals p
                JOIN clients c ON p.client_id = c.id
                WHERE p.id = ?
            `);
            const process = stmt.get(id);

            if (!process) {
                return res.status(404).json({ error: 'Processo não encontrado.' });
            }

            const eventsStmt = db.prepare(`
                SELECT * FROM process_events 
                WHERE proposal_id = ? 
                ORDER BY id DESC
            `);
            process.events = eventsStmt.all(id);

            return res.status(200).json({ success: true, data: process });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Busca processo por número de contrato (ex: 49281-IMOB)
     */
    getByContractNumber(req, res) {
        try {
            const { contractNumber } = req.params;
            const stmt = db.prepare(`
                SELECT p.*, c.name as client_name, c.cpf as client_cpf, c.email as client_email, c.phone as client_phone
                FROM proposals p
                JOIN clients c ON p.client_id = c.id
                WHERE p.contract_number = ?
            `);
            const process = stmt.get(contractNumber);

            if (!process) {
                return res.status(404).json({ error: `Contrato '${contractNumber}' não localizado.` });
            }

            const eventsStmt = db.prepare(`
                SELECT * FROM process_events 
                WHERE proposal_id = ? 
                ORDER BY id DESC
            `);
            process.events = eventsStmt.all(process.id);

            return res.status(200).json({ success: true, data: process });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Retorna a linha do tempo de eventos de um processo
     */
    getTimeline(req, res) {
        try {
            const { id } = req.params;
            const stmt = db.prepare(`
                SELECT * FROM process_events 
                WHERE proposal_id = ? 
                ORDER BY id DESC
            `);
            const events = stmt.all(id);
            return res.status(200).json({ success: true, data: events });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Adiciona um evento manual à linha do tempo
     */
    addEvent(req, res) {
        try {
            const { id } = req.params;
            const { title, description, icon } = req.body;

            if (!title || !description) {
                return res.status(400).json({ error: 'Título e descrição são obrigatórios para o evento.' });
            }

            const event = addProcessEvent(id, { title, description, icon });
            return res.status(201).json({ success: true, message: 'Evento adicionado com sucesso!', data: event });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Avança ou altera a etapa do processo (1 a 4)
     */
    updateStep(req, res) {
        try {
            const { id } = req.params;
            const { step, message } = req.body;

            if (!step || step < 1 || step > 4) {
                return res.status(400).json({ error: 'O campo step deve ser um número entre 1 (Análise) e 4 (Liberação).' });
            }

            const result = updateProposalStep(id, step, message);
            return res.status(200).json({ success: true, message: 'Etapa atualizada com sucesso!', data: result });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
};
