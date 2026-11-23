-- Schema SQL para o Banco de Dados do Portal de Serviços Financeiros (MP Consultoria)

CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cpf TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    monthly_income REAL DEFAULT 0.0,
    occupation TEXT,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_number TEXT UNIQUE NOT NULL,
    client_id INTEGER NOT NULL,
    service_type TEXT NOT NULL, -- FIN_IMOB, FIN_VEIC, CONS_IMOB, CONS_VEIC, CONSIGNADO_INSS, CONSIGNADO_PUBLICO, FGTS_ANIVERSARIO, CARTAO_CREDITO
    title TEXT NOT NULL,
    current_step INTEGER NOT NULL DEFAULT 1, -- 1: Análise, 2: Aprovação, 3: Assinatura, 4: Liberação
    step_name TEXT NOT NULL DEFAULT 'ANALISE', -- ANALISE, APROVACAO, ASSINATURA, LIBERACAO
    status TEXT NOT NULL DEFAULT 'EM_ANDAMENTO', -- EM_ANDAMENTO, CONCLUIDO, CANCELADO, RECUSADO
    status_label TEXT NOT NULL DEFAULT 'Em Andamento',
    amount REAL NOT NULL,
    down_payment REAL DEFAULT 0.0,
    term_months INTEGER NOT NULL,
    interest_or_admin_rate REAL NOT NULL DEFAULT 0.0,
    monthly_installment REAL NOT NULL,
    total_amount REAL NOT NULL,
    amortization_system TEXT DEFAULT 'PRICE', -- PRICE, SAC, CONSORCIO
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS process_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT DEFAULT 'info',
    event_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS simulations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_type TEXT NOT NULL,
    asset_value REAL NOT NULL,
    down_payment REAL DEFAULT 0.0,
    term_months INTEGER NOT NULL,
    monthly_interest_rate REAL NOT NULL,
    annual_interest_rate REAL NOT NULL,
    admin_fee_rate REAL DEFAULT 0.0,
    monthly_installment REAL NOT NULL,
    first_installment REAL,
    last_installment REAL,
    total_interest_or_cost REAL NOT NULL,
    total_amount REAL NOT NULL,
    amortization_system TEXT DEFAULT 'PRICE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    service_interest TEXT,
    message TEXT,
    simulation_id INTEGER,
    status TEXT DEFAULT 'NOVO', -- NOVO, EM_CONTATO, CONVERTIDO, ARQUIVADO
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (simulation_id) REFERENCES simulations(id)
);

CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    card_number_masked TEXT NOT NULL,
    card_brand TEXT NOT NULL DEFAULT 'Mastercard',
    card_type TEXT NOT NULL DEFAULT 'CREDIT',
    card_name TEXT NOT NULL,
    credit_limit REAL NOT NULL,
    available_limit REAL NOT NULL,
    annual_fee REAL DEFAULT 0.0,
    cashback_rate REAL DEFAULT 0.015,
    account_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ATIVO', -- ATIVO, BLOQUEADO, EM_ANALISE
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Índices para otimização de busca rápida
CREATE INDEX IF NOT EXISTS idx_clients_cpf ON clients(cpf);
CREATE INDEX IF NOT EXISTS idx_proposals_client ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_contract ON proposals(contract_number);
CREATE INDEX IF NOT EXISTS idx_process_events_proposal ON process_events(proposal_id);
