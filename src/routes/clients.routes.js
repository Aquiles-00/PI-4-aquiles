import { Router } from 'express';
import { clientController } from '../controllers/clientController.js';

const router = Router();

// GET /api/clients/search?cpf=... - Busca cliente e processos por CPF
router.get('/search', clientController.searchByCPF);

// GET /api/clients - Lista todos os clientes
router.get('/', clientController.getAll);

// POST /api/clients - Cria novo cliente
router.post('/', clientController.create);

export default router;
