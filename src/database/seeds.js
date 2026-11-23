import { db, initDatabase } from '../config/database.js';

export function seed() {
    console.log('🌱 Inicializando carga de dados (seeds)...');
    
    // Garante que as tabelas existem
    initDatabase();

    // Limpa tabelas existentes para seed limpa
    db.exec(`
        DELETE FROM process_events;
        DELETE FROM proposals;
        DELETE FROM cards;
        DELETE FROM leads;
        DELETE FROM simulations;
        DELETE FROM clients;
    `);

    // 1. Inserção de Clientes
    const insertClient = db.prepare(`
        INSERT INTO clients (id, cpf, name, email, phone, monthly_income, occupation, avatar_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertClient.run(
        1,
        '123.456.789-00',
        'João Silva',
        'joao.silva@email.com',
        '(11) 98765-4321',
        8500.00,
        'Engenheiro de Software',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBW12h1y0KEC7l-2G0Wt1dVII12EbfpxIgSz31C_xXtK2e5XduWdE5i7QOc64Ic_Ss1A1wM912JNkm_BiyGHWwDc27lnvYcBD8e1mDK7jNK9UYbg6i0RYzvwLTnQI7XAnPg-N47JTENhVe0k_ftIyHWKfka54AIgaTzYQyxS8hgzp2nTqYZ_mJTD1K3S2mNk4d2f_nLhVXOkbQ0DRwt9qLqru7j1r-mTe4SLd-YiHgEPXdlwX3GiLQ'
    );

    insertClient.run(
        2,
        '234.567.890-11',
        'Maria Aparecida Souza',
        'maria.souza@email.com',
        '(11) 97654-3210',
        4200.00,
        'Aposentada INSS',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuC40sYxY2uo00-Lq7ObFWLdUcaix7AjLW6wt0OeqLe1z8_d8IS3BYz3LRlf1QJefHrWSY0Aqk9Pi5RIEA3Y8nMoOgzsT7H1xUUoBQwhO72__nWg0YIekRsnnWFR5NBZFHRNPFzTZTNbxUoZY1iHnO19v4FS0xLQ3Lpo7MlRo08k8yO-2viv6wTL1CQFK-FV4FnHrrxMX9qICPP3PdkctM8oODYyFvUvxuwd26r9bx2R0wergEq3W-I'
    );

    insertClient.run(
        3,
        '345.678.901-22',
        'Carlos Eduardo Mendes',
        'carlos.mendes@email.com',
        '(21) 99887-1122',
        12000.00,
        'Empresário',
        ''
    );

    // 2. Inserção de Processos / Propostas
    const insertProposal = db.prepare(`
        INSERT INTO proposals (
            id, contract_number, client_id, service_type, title,
            current_step, step_name, status, status_label,
            amount, down_payment, term_months, interest_or_admin_rate,
            monthly_installment, total_amount, amortization_system
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Processo 1 do João Silva: Financiamento Imobiliário (Em andamento - Passo 3: Assinatura)
    insertProposal.run(
        1,
        '49281-IMOB',
        1,
        'FIN_IMOB',
        'Financiamento Imobiliário',
        3,
        'ASSINATURA',
        'EM_ANDAMENTO',
        'Em Andamento',
        380000.00,
        95000.00,
        360,
        9.99,
        2780.45,
        995962.00,
        'PRICE'
    );

    // Processo 2 do João Silva: FGTS (Passo 1: Análise)
    insertProposal.run(
        2,
        '8832-FGTS',
        1,
        'FGTS_ANIVERSARIO',
        'Empréstimo Saque-Aniversário FGTS',
        1,
        'ANALISE',
        'EM_ANDAMENTO',
        'Análise Inicial',
        14500.00,
        0.00,
        60,
        1.79,
        0.00,
        14500.00,
        'FGTS'
    );

    // Processo da Maria: Consignado INSS (Passo 4: Liberação Concluída)
    insertProposal.run(
        3,
        '77123-INSS',
        2,
        'CONSIGNADO_INSS',
        'Empréstimo Consignado INSS',
        4,
        'LIBERACAO',
        'CONCLUIDO',
        'Crédito Liberado',
        22000.00,
        0.00,
        84,
        1.66,
        485.30,
        40765.20,
        'PRICE'
    );

    // Processo do Carlos: Consórcio Imobiliário (Passo 2: Aprovação)
    insertProposal.run(
        4,
        '99412-CONS',
        3,
        'CONS_IMOB',
        'Consórcio de Imóvel',
        2,
        'APROVACAO',
        'EM_ANDAMENTO',
        'Cota Ativada',
        500000.00,
        0.00,
        240,
        18.00,
        2458.33,
        590000.00,
        'CONSORCIO'
    );

    // 3. Inserção de Eventos da Linha do Tempo
    const insertEvent = db.prepare(`
        INSERT INTO process_events (proposal_id, title, description, icon, event_time)
        VALUES (?, ?, ?, ?, ?)
    `);

    insertEvent.run(
        1,
        'Contratos Gerados',
        'Os contratos foram emitidos e enviados para sua área de assinatura digital.',
        'drafts',
        '2026-08-15 10:45:00'
    );

    insertEvent.run(
        1,
        'Crédito Aprovado',
        'Análise de crédito concluída com sucesso pelo banco emissor.',
        'check_circle',
        '2026-08-14 16:30:00'
    );

    insertEvent.run(
        1,
        'Avaliação do Imóvel Aprovada',
        'Laudo técnico de engenharia aprovado pela instituição financeira.',
        'real_estate_agent',
        '2026-08-12 14:00:00'
    );

    insertEvent.run(
        2,
        'Documentação Recebida',
        'Todos os documentos necessários foram anexados ao processo de antecipação do FGTS.',
        'upload_file',
        '2026-08-15 09:15:00'
    );

    insertEvent.run(
        2,
        'Consulta de Saldo FGTS',
        'Saldo de R$ 18.250,00 verificado e reservado junto à Caixa Econômica.',
        'savings',
        '2026-08-15 09:10:00'
    );

    insertEvent.run(
        3,
        'Recurso Creditado',
        'Valor de R$ 22.000,00 depositado com sucesso via TED na conta do cliente.',
        'account_balance_wallet',
        '2026-08-10 11:30:00'
    );

    // 4. Inserção de Cartões
    const insertCard = db.prepare(`
        INSERT INTO cards (
            client_id, card_number_masked, card_brand, card_type,
            card_name, credit_limit, available_limit, annual_fee,
            cashback_rate, account_number, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertCard.run(
        1,
        '•••• •••• •••• 4589',
        'Mastercard Platinum',
        'CREDIT',
        'JOAO SILVA',
        12000.00,
        9450.00,
        0.00,
        0.015,
        '482910-4',
        'ATIVO'
    );

    // 5. Inserção de Leads Iniciais
    const insertLead = db.prepare(`
        INSERT INTO leads (name, email, phone, service_interest, message, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertLead.run(
        'Ana Beatriz Lima',
        'ana.beatriz@email.com',
        '(11) 91234-5678',
        'Financiamento Imobiliário',
        'Gostaria de simular um imóvel de R$ 450 mil na Zona Sul.',
        'NOVO'
    );

    insertLead.run(
        'Roberto Camargo',
        'roberto.camargo@email.com',
        '(11) 92345-6789',
        'Consignado INSS',
        'Gostaria de saber qual minha margem consignável disponível.',
        'NOVO'
    );

    console.log('✅ Seeds carregadas com sucesso!');
    console.log('   - 3 Clientes (incluindo João Silva: 123.456.789-00)');
    console.log('   - 4 Processos (#49281-IMOB, #8832-FGTS, #77123-INSS, #99412-CONS)');
    console.log('   - 6 Eventos de Linha do Tempo');
    console.log('   - 1 Cartão de Crédito Platinum');
    console.log('   - 2 Leads de Contato');
}

// Executar diretamente se chamado pelo Node
if (process.argv[1] && process.argv[1].endsWith('seeds.js')) {
    seed();
}
