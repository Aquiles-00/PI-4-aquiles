import { Router } from 'express';
import simulationsRouter from './simulations.routes.js';
import clientsRouter from './clients.routes.js';
import processesRouter from './processes.routes.js';
import proposalsRouter from './proposals.routes.js';
import cardsRouter from './cards.routes.js';
import leadsRouter from './leads.routes.js';

const api = Router();

// Health Check
api.get('/health', (req, res) => {
    res.status(200).json({
        status: 'online',
        service: 'Portal de Serviços Financeiros API - MP Consultoria',
        timestamp: new Date().toISOString()
    });
});

// API Overview
api.get('/info', (req, res) => {
    res.status(200).json({
        service: 'MP Consultoria - Backend de Serviços Financeiros',
        version: '1.0.0',
        endpoints: {
            simulations: {
                calculate: 'POST /api/simulations/calculate',
                getById: 'GET /api/simulations/:id'
            },
            clients: {
                searchByCPF: 'GET /api/clients/search?cpf={cpf}',
                getAll: 'GET /api/clients',
                create: 'POST /api/clients'
            },
            processes: {
                getById: 'GET /api/processes/:id',
                getByContract: 'GET /api/processes/contract/:contractNumber',
                getTimeline: 'GET /api/processes/:id/timeline',
                addEvent: 'POST /api/processes/:id/events',
                updateStep: 'PATCH /api/processes/:id/step'
            },
            proposals: {
                getAll: 'GET /api/proposals',
                create: 'POST /api/proposals'
            },
            cards: {
                apply: 'POST /api/cards/apply',
                getByCPF: 'GET /api/cards/client/:cpf'
            },
            leads: {
                create: 'POST /api/leads',
                getAll: 'GET /api/leads'
            }
        }
    });
});

// Conecta sub-rotas
api.use('/simulations', simulationsRouter);
api.use('/clients', clientsRouter);
api.use('/processes', processesRouter);
api.use('/proposals', proposalsRouter);
api.use('/cards', cardsRouter);
api.use('/leads', leadsRouter);

export default api;
