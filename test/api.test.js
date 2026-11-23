import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../src/database/seeds.js';
import { 
    calculatePriceInstallment, 
    calculateSAC, 
    simulateFinancing, 
    simulateConsortium, 
    simulatePayrollLoan, 
    simulateFGTSAdvance 
} from '../src/services/financialMathService.js';
import app from '../src/server.js';

let server;
let baseUrl;

before(async () => {
    // Inicializa banco com dados de teste
    seed();
    
    // Inicia servidor em porta aleatória para testes
    await new Promise((resolve) => {
        server = app.listen(0, () => {
            const port = server.address().port;
            baseUrl = `http://localhost:${port}/api`;
            resolve();
        });
    });
});

after(() => {
    if (server) {
        server.close();
    }
});

describe('1. Motor de Cálculos Financeiros (financialMathService)', () => {
    test('calculatePriceInstallment calcula valor correto para financiamento', () => {
        // PV = 100.000, i = 1% ao mês, n = 12 meses -> Parcela ~ 8884.88
        const pmt = calculatePriceInstallment(100000, 0.01, 12);
        assert.ok(Math.abs(pmt - 8884.88) < 0.1);
    });

    test('calculateSAC calcula primeira parcela maior que a última', () => {
        const sac = calculateSAC(120000, 0.01, 12);
        assert.equal(sac.amortization, 10000);
        assert.ok(sac.firstInstallment > sac.lastInstallment);
        assert.equal(sac.firstInstallment, 11200); // 10.000 + 1.200
        assert.equal(sac.lastInstallment, 10100);  // 10.000 + 100
    });

    test('simulateFinancing para Imóvel aplica taxas e entrada corretamente', () => {
        const result = simulateFinancing({
            serviceType: 'FIN_IMOB',
            assetValue: 300000,
            downPayment: 60000,
            termMonths: 360
        });

        assert.equal(result.financedAmount, 240000);
        assert.equal(result.termMonths, 360);
        assert.ok(result.monthlyInstallment > 0);
        assert.ok(result.totalAmount > 300000);
    });

    test('simulateConsortium calcula custo sem juros e com taxa de administração', () => {
        const result = simulateConsortium({
            serviceType: 'CONS_IMOB',
            assetValue: 300000,
            termMonths: 240
        });

        assert.equal(result.monthlyInterestRate, 0);
        assert.ok(result.adminFeeRate > 0);
        assert.ok(result.monthlyInstallment > 0);
        assert.ok(result.totalAmount < 400000); // Consórcio tem custo muito menor que juros compostos
    });

    test('simulatePayrollLoan calcula parcelas e status de margem', () => {
        const result = simulatePayrollLoan({
            serviceType: 'CONSIGNADO_INSS',
            loanAmount: 15000,
            termMonths: 60,
            monthlyIncome: 5000
        });

        assert.equal(result.monthlyInterestRate, 1.66);
        assert.equal(result.marginStatus, 'APROVADO_MARGEM');
        assert.ok(result.monthlyInstallment < result.marginAvailable);
    });

    test('simulateFGTSAdvance calcula antecipação de múltiplos anos', () => {
        const result = simulateFGTSAdvance({
            fgtsBalance: 20000,
            yearsToAdvance: 5
        });

        assert.equal(result.yearsToAdvance, 5);
        assert.ok(result.totalNetReleased > 0);
        assert.equal(result.installments.length, 5);
    });
});

describe('2. Endpoints da API REST', () => {
    test('GET /api/health deve retornar status online', async () => {
        const res = await fetch(`${baseUrl}/health`);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.status, 'online');
    });

    test('GET /api/info deve listar documentação das rotas', async () => {
        const res = await fetch(`${baseUrl}/info`);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.ok(data.endpoints.simulations);
        assert.ok(data.endpoints.clients);
        assert.ok(data.endpoints.processes);
    });

    test('POST /api/simulations/calculate deve retornar cálculo com sucesso', async () => {
        const res = await fetch(`${baseUrl}/simulations/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                serviceType: 'FIN_IMOB',
                assetValue: 400000,
                downPayment: 80000,
                termMonths: 360
            })
        });

        assert.equal(res.status, 200);
        const json = await res.json();
        assert.equal(json.success, true);
        assert.equal(json.data.financedAmount, 320000);
        assert.ok(json.data.simulationId > 0);
    });

    test('GET /api/clients/search?cpf=123.456.789-00 deve retornar o cliente João Silva com processos', async () => {
        const res = await fetch(`${baseUrl}/clients/search?cpf=123.456.789-00`);
        assert.equal(res.status, 200);
        const json = await res.json();
        assert.equal(json.success, true);
        assert.equal(json.data.client.name, 'João Silva');
        assert.ok(json.data.proposals.length >= 2);
        assert.ok(json.data.recentHistory.length >= 1);
    });

    test('GET /api/clients/search com CPF apenas numérico também deve localizar o cliente', async () => {
        const res = await fetch(`${baseUrl}/clients/search?cpf=12345678900`);
        assert.equal(res.status, 200);
        const json = await res.json();
        assert.equal(json.success, true);
        assert.equal(json.data.client.name, 'João Silva');
    });

    test('GET /api/processes/contract/49281-IMOB deve retornar detalhes do contrato', async () => {
        const res = await fetch(`${baseUrl}/processes/contract/49281-IMOB`);
        assert.equal(res.status, 200);
        const json = await res.json();
        assert.equal(json.success, true);
        assert.equal(json.data.contract_number, '49281-IMOB');
        assert.equal(json.data.client_name, 'João Silva');
        assert.ok(json.data.events.length >= 1);
    });

    test('PATCH /api/processes/:id/step deve atualizar a etapa do processo e registrar evento', async () => {
        const res = await fetch(`${baseUrl}/processes/1/step`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ step: 4, message: 'Recurso liberado com sucesso!' })
        });

        assert.equal(res.status, 200);
        const json = await res.json();
        assert.equal(json.success, true);
        assert.equal(json.data.currentStep, 4);
        assert.equal(json.data.status, 'CONCLUIDO');

        // Verifica se evento foi gravado
        const timelineRes = await fetch(`${baseUrl}/processes/1/timeline`);
        const timelineJson = await timelineRes.json();
        assert.ok(timelineJson.data.some(e => e.description === 'Recurso liberado com sucesso!'));
    });

    test('POST /api/proposals deve criar nova proposta com sucesso', async () => {
        const res = await fetch(`${baseUrl}/proposals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cpf: '987.654.321-99',
                clientName: 'Fernanda Oliveira',
                phone: '(11) 99123-4567',
                serviceType: 'FIN_VEIC',
                amount: 75000,
                downPayment: 15000,
                termMonths: 48
            })
        });

        assert.equal(res.status, 201);
        const json = await res.json();
        assert.equal(json.success, true);
        assert.ok(json.data.contractNumber.includes('-AUTO'));
        assert.ok(json.data.monthlyInstallment > 0);
    });

    test('POST /api/cards/apply deve aprovar cartão e criar conta', async () => {
        const res = await fetch(`${baseUrl}/cards/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cpf: '555.666.777-88',
                name: 'Juliana Costa',
                monthlyIncome: 6500,
                phone: '(11) 98888-7777'
            })
        });

        assert.equal(res.status, 201);
        const json = await res.json();
        assert.equal(json.success, true);
        assert.ok(json.data.creditLimit >= 4000);
        assert.equal(json.data.status, 'ATIVO');
    });

    test('POST /api/leads deve registrar solicitação de contato', async () => {
        const res = await fetch(`${baseUrl}/leads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Lucas Martins',
                phone: '(11) 97777-6666',
                email: 'lucas@email.com',
                serviceInterest: 'Consórcio Imobiliário',
                message: 'Quero adquirir uma carta de crédito de 400 mil.'
            })
        });

        assert.equal(res.status, 201);
        const json = await res.json();
        assert.equal(json.success, true);
        assert.ok(json.data.leadId > 0);
    });
});
