import { Router } from 'express';
import { simulationController } from '../controllers/simulationController.js';

const router = Router();

// POST /api/simulations/calculate - Calcula estimativa
router.post('/calculate', simulationController.calculate);

// GET /api/simulations/:id - Busca simulação por ID
router.get('/:id', simulationController.getById);

export default router;
