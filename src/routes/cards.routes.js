import { Router } from 'express';
import { cardController } from '../controllers/cardController.js';

const router = Router();

// POST /api/cards/apply - Solicita cartão e conta
router.post('/apply', cardController.apply);

// GET /api/cards/client/:cpf - Consulta cartões por CPF
router.get('/client/:cpf', cardController.getByCPF);

export default router;
