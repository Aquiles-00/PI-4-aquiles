import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import apiRouter from './routes/api.js';
import { initDatabase } from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializa banco de dados
initDatabase();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos (páginas HTML do frontend conectadas)
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API REST
app.use('/api', apiRouter);

// Rota raiz e atalhos amigáveis para as páginas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/area-do-cliente', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'client_portal.html'));
});

app.get('/financiamento-consorcio', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'financing_consortium.html'));
});

app.get('/consignado-cartoes', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'payroll_cards.html'));
});

// Middleware para tratamento de 404 da API
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'Rota da API não encontrada.',
        path: req.originalUrl
    });
});

// Tratamento global de erros
app.use((err, req, res, next) => {
    console.error('❌ Erro no servidor:', err);
    res.status(500).json({
        error: 'Erro interno no servidor.',
        message: err.message
    });
});

// Inicialização do Servidor (apenas quando executado diretamente)
const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isMainModule) {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor MP Consultoria rodando em http://localhost:${PORT}`);
        console.log(`📑 Documentação da API: http://localhost:${PORT}/api/info`);
        console.log(`👤 Área do Cliente: http://localhost:${PORT}/area-do-cliente`);
    });
}

export default app;
