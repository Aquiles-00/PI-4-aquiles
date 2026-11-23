import { Router } from 'express';
import { proposalController } from '../controllers/proposalController.js';

const router = Router();

// GET /api/proposals - Lista propostas
router.get('/', proposalController.getAll);

// POST /api/proposals - Cria proposta
router.post('/', proposalController.create);

export default router;
