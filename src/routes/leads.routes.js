import { Router } from 'express';
import { leadController } from '../controllers/leadController.js';

const router = Router();

// POST /api/leads - Registra lead / "Falar com Consultor"
router.post('/', leadController.create);

// GET /api/leads - Lista leads captados
router.get('/', leadController.getAll);

export default router;
