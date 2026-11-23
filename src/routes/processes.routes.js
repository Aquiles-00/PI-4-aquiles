import { Router } from 'express';
import { processController } from '../controllers/processController.js';

const router = Router();

// GET /api/processes/:id - Detalhes do processo por ID
router.get('/:id', processController.getById);

// GET /api/processes/contract/:contractNumber - Detalhes por número do contrato (ex: 49281-IMOB)
router.get('/contract/:contractNumber', processController.getByContractNumber);

// GET /api/processes/:id/timeline - Histórico de eventos
router.get('/:id/timeline', processController.getTimeline);

// POST /api/processes/:id/events - Adiciona evento à linha do tempo
router.post('/:id/events', processController.addEvent);

// PATCH /api/processes/:id/step - Atualiza etapa do processo (1 a 4)
router.patch('/:id/step', processController.updateStep);

export default router;
