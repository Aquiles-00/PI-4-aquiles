import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = process.env.VERCEL 
    ? '/tmp' 
    : path.resolve(__dirname, '../../data');

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const defaultDbPath = path.join(dbDir, 'financial_portal.sqlite');
const dbPath = process.env.DB_PATH || defaultDbPath;

export const db = new DatabaseSync(dbPath);

// Carregar e executar Schema
export function initDatabase() {
    const schemaPath = path.resolve(__dirname, '../database/schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schemaSQL);

    // Auto-seed se a tabela de clientes estiver vazia
    try {
        const checkClients = db.prepare('SELECT count(*) as count FROM clients').get();
        if (checkClients && checkClients.count === 0) {
            import('../database/seeds.js').then(module => {
                module.seed();
            }).catch(err => console.error('Erro no auto-seed:', err));
        }
    } catch (e) {
        // Ignora caso seja a primeira inicialização da tabela
    }
}

// Inicializa o banco de dados na inicialização
initDatabase();

export default db;
