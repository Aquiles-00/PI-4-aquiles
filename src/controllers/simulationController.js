import { 
    simulateFinancing, 
    simulateConsortium, 
    simulatePayrollLoan, 
    simulateFGTSAdvance 
} from '../services/financialMathService.js';
import { db } from '../config/database.js';

export const simulationController = {
    /**
     * Calcula a estimativa com base no tipo de modalidade
     */
    calculate(req, res) {
        try {
            const { 
                serviceType, 
                assetValue, 
                downPayment = 0, 
                termMonths, 
                system = 'PRICE',
                monthlyIncome,
                fgtsBalance,
                yearsToAdvance,
                bidAmount = 0
            } = req.body;

            if (!serviceType) {
                return res.status(400).json({ error: 'O campo serviceType é obrigatório.' });
            }

            let result;

            switch (serviceType.toUpperCase()) {
                case 'FIN_IMOB':
                case 'FIN_VEIC':
                    if (!assetValue || !termMonths) {
                        return res.status(400).json({ error: 'assetValue e termMonths são obrigatórios para financiamento.' });
                    }
                    result = simulateFinancing({
                        serviceType: serviceType.toUpperCase(),
                        assetValue: Number(assetValue),
                        downPayment: Number(downPayment),
                        termMonths: Number(termMonths),
                        system
                    });
                    break;

                case 'CONS_IMOB':
                case 'CONS_VEIC':
                    if (!assetValue || !termMonths) {
                        return res.status(400).json({ error: 'assetValue e termMonths são obrigatórios para consórcio.' });
                    }
                    result = simulateConsortium({
                        serviceType: serviceType.toUpperCase(),
                        assetValue: Number(assetValue),
                        termMonths: Number(termMonths),
                        bidAmount: Number(bidAmount)
                    });
                    break;

                case 'CONSIGNADO_INSS':
                case 'CONSIGNADO_PUBLICO':
                    if (!assetValue && !req.body.loanAmount) {
                        return res.status(400).json({ error: 'loanAmount ou assetValue é obrigatório para consignado.' });
                    }
                    result = simulatePayrollLoan({
                        serviceType: serviceType.toUpperCase(),
                        loanAmount: Number(assetValue || req.body.loanAmount),
                        termMonths: Number(termMonths || 60),
                        monthlyIncome: monthlyIncome ? Number(monthlyIncome) : null
                    });
                    break;

                case 'FGTS_ANIVERSARIO':
                    if (!fgtsBalance && !assetValue) {
                        return res.status(400).json({ error: 'fgtsBalance é obrigatório para antecipação de FGTS.' });
                    }
                    result = simulateFGTSAdvance({
                        fgtsBalance: Number(fgtsBalance || assetValue),
                        yearsToAdvance: Number(yearsToAdvance || 5)
                    });
                    break;

                default:
                    return res.status(400).json({ 
                        error: `Tipo de serviço '${serviceType}' não suportado. Use: FIN_IMOB, FIN_VEIC, CONS_IMOB, CONS_VEIC, CONSIGNADO_INSS, CONSIGNADO_PUBLICO, FGTS_ANIVERSARIO.` 
                    });
            }

            // Opcional: salvar simulação no banco para histórico
            const saveStmt = db.prepare(`
                INSERT INTO simulations (
                    service_type, asset_value, down_payment, term_months, 
                    monthly_interest_rate, annual_interest_rate, admin_fee_rate,
                    monthly_installment, first_installment, last_installment,
                    total_interest_or_cost, total_amount, amortization_system
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const insertRes = saveStmt.run(
                result.serviceType,
                result.assetValue || result.loanAmount || result.fgtsBalance || 0,
                result.downPayment || 0,
                result.termMonths || result.yearsToAdvance || 0,
                result.monthlyInterestRate || 0,
                result.annualInterestRate || 0,
                result.adminFeeRate || 0,
                result.monthlyInstallment || result.totalNetReleased || 0,
                result.firstInstallment || result.monthlyInstallment || 0,
                result.lastInstallment || result.monthlyInstallment || 0,
                result.totalInterestOrCost || 0,
                result.totalAmount || result.totalNetReleased || 0,
                result.system || 'PRICE'
            );

            result.simulationId = insertRes.lastInsertRowid;

            return res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Retorna uma simulação gravada previamente
     */
    getById(req, res) {
        try {
            const { id } = req.params;
            const stmt = db.prepare('SELECT * FROM simulations WHERE id = ?');
            const simulation = stmt.get(id);

            if (!simulation) {
                return res.status(404).json({ error: 'Simulação não encontrada.' });
            }

            return res.status(200).json({ success: true, data: simulation });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
};
