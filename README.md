# Portal de Serviços Financeiros - MP Consultoria (Back-end)

Back-end completo e integrado para a plataforma de correspondente bancário e serviços financeiros da **MP Consultoria**, baseado no design system e telas do projeto Stitch.

---

## 🚀 Tecnologias Utilizadas

- **Node.js (v24)** (ES Modules)
- **Express.js** (API REST e servidor estático)
- **SQLite Nativo (`node:sqlite`)** (Armazenamento relacional rápido e sem dependências binárias externas)
- **CORS** (Suporte a integração cross-origin)
- **Tailwind CSS & Material Symbols** (Interface visual conectada)

---

## 📐 Estrutura do Projeto

```
.
├── src/
│   ├── config/
│   │   └── database.js               # Conexão e inicialização com SQLite
│   ├── controllers/
│   │   ├── clientController.js       # Busca de clientes e processos por CPF
│   │   ├── processController.js      # Detalhes de contratos, histórico e avanço de etapas
│   │   ├── simulationController.js   # Motor de cálculo de financiamentos e consórcios
│   │   ├── proposalController.js     # Criação de propostas com cálculos embutidos
│   │   ├── cardController.js         # Emissão de cartões e conta digital com limite
│   │   └── leadController.js         # Captação de leads ("Falar com Consultor")
│   ├── database/
│   │   ├── schema.sql                # Modelagem relacional do banco de dados
│   │   └── seeds.js                  # Carga inicial com clientes, processos e histórico
│   ├── routes/
│   │   ├── api.js                    # Roteador central da API (/api)
│   │   ├── simulations.routes.js     # Rotas de simulação
│   │   ├── clients.routes.js         # Rotas de clientes
│   │   ├── processes.routes.js       # Rotas de processos e linha do tempo
│   │   ├── proposals.routes.js       # Rotas de propostas
│   │   ├── cards.routes.js           # Rotas de cartões
│   │   └── leads.routes.js           # Rotas de contato/leads
│   ├── services/
│   │   ├── financialMathService.js   # Fórmulas financeiras (Price, SAC, Consórcios, FGTS)
│   │   └── notificationService.js    # Gerenciador de status e histórico de eventos
│   ├── public/                       # Frontend interativo conectado ao backend
│   │   ├── index.html                # Página Inicial (Home)
│   │   ├── client_portal.html        # Área do Cliente (Busca por CPF e Stepper)
│   │   ├── financing_consortium.html # Financiamento e Consórcio com link para Simulador Habitacional Caixa
│   │   ├── payroll_cards.html        # Consignado e Solicitação de Cartão
│   │   └── js/
│   │       └── api.js                # Cliente de integração com a API REST
│   └── server.js                     # Servidor Express principal
├── test/
│   └── api.test.js                   # Suíte de 16 testes automatizados
├── package.json
└── README.md
```

---

## ⚡ Como Executar

### 1. Instalar dependências
```bash
npm install
```

### 2. Popular o Banco de Dados com Dados de Teste
```bash
npm run seed
```

### 3. Iniciar o Servidor
```bash
npm start
```
Ou em modo de desenvolvimento com hot-reload:
```bash
npm run dev
```

O servidor estará disponível em: **`http://localhost:3000`**

### 4. Executar os Testes Automatizados
```bash
npm test
```

---

## 📊 Endpoints da API REST

### 🔍 Visão Geral & Health Check
- `GET /api/health`: Status do servidor.
- `GET /api/info`: Documentação interativa dos endpoints.

### 🧮 Simulações Financeiras (`/api/simulations`)
- `POST /api/simulations/calculate`: Realiza cálculo de parcelas, juros, amortização e taxa de administração.
  - **Modalidades Suportadas**:
    - `FIN_IMOB`: Financiamento Imobiliário (Tabela Price ou SAC, até 420 meses, juros ~9.99% a.a.)
    - `FIN_VEIC`: Financiamento de Veículos (CDC, até 60 meses, juros ~1.49% a.m.)
    - `CONS_IMOB`: Consórcio Imobiliário (Zero Juros, taxa adm ~16% total, até 240 meses)
    - `CONS_VEIC`: Consórcio de Veículos (Zero Juros, taxa adm ~13% total, até 84 meses)
    - `CONSIGNADO_INSS`: Empréstimo com desconto em folha INSS (Taxa teto 1.66% a.m., margem de 35%)
    - `CONSIGNADO_PUBLICO`: Consignado Servidor Público (Taxa 1.55% a.m., margem de 35%)
    - `FGTS_ANIVERSARIO`: Antecipação de até 10 anos de Saque-Aniversário FGTS (1.79% a.m.)
- `GET /api/simulations/:id`: Retorna dados de uma simulação salva.

### 👤 Clientes e Área do Cliente (`/api/clients`)
- `GET /api/clients/search?cpf=123.456.789-00`: Busca cliente por CPF (formatado ou apenas dígitos), retornando perfil, processos ativos, cartões e histórico recente.
- `GET /api/clients`: Lista todos os clientes.
- `POST /api/clients`: Cadastra novo cliente.

### 📋 Processos e Acompanhamento (`/api/processes`)
- `GET /api/processes/:id`: Detalhes completos do processo.
- `GET /api/processes/contract/:contractNumber`: Busca por número do contrato (ex: `49281-IMOB`, `8832-FGTS`).
- `GET /api/processes/:id/timeline`: Lista de eventos cronológicos com ícones e status.
- `POST /api/processes/:id/events`: Insere novo evento na linha do tempo.
- `PATCH /api/processes/:id/step`: Atualiza a etapa do processo (1 a 4):
  - **1: Análise** (`ANALISE`)
  - **2: Aprovação** (`APROVACAO`)
  - **3: Assinatura** (`ASSINATURA`)
  - **4: Liberação** (`LIBERACAO`)

### 📝 Propostas de Crédito (`/api/proposals`)
- `POST /api/proposals`: Cria nova proposta calculando parcelas automaticamente e gerando número de contrato.
- `GET /api/proposals`: Lista propostas com filtros por status ou modalidade.

### 💳 Cartões de Crédito e Contas (`/api/cards`)
- `POST /api/cards/apply`: Solicitação de cartão Platinum e abertura de Conta Digital com análise de limite baseada na renda.
- `GET /api/cards/client/:cpf`: Lista cartões do cliente por CPF.

### 📬 Contato e Leads (`/api/leads`)
- `POST /api/leads`: Registra solicitação de "Falar com Consultor" ou contato.
- `GET /api/leads`: Lista leads captados para CRM.

---

## 👥 Dados de Demonstração (Seeds)

Para testar a Área do Cliente no navegador ou via API, use os CPFs pré-cadastrados:

| Cliente | CPF | Processos Cadastrados | Cartão |
| :--- | :--- | :--- | :--- |
| **João Silva** | `123.456.789-00` (ou `12345678900`) | `#49281-IMOB` (Assinatura), `#8832-FGTS` (Análise) | Mastercard Platinum (Limite R$ 12.000) |
| **Maria Aparecida Souza** | `234.567.890-11` | `#77123-INSS` (Liberação Concluída) | - |
| **Carlos Eduardo Mendes** | `345.678.901-22` | `#99412-CONS` (Aprovação - Cota Ativa) | - |
