import { db } from '../config/database.js';

export const STEP_METADATA = {
    1: { code: 'ANALISE', label: 'Análise', defaultDesc: 'Análise cadastral e de crédito em andamento.', icon: 'search' },
    2: { code: 'APROVACAO', label: 'Aprovação', defaultDesc: 'Crédito e documentação aprovados pela instituição emissora.', icon: 'check_circle' },
    3: { code: 'ASSINATURA', label: 'Assinatura', defaultDesc: 'Contrato gerado. Aguardando assinatura eletrônica do cliente.', icon: 'drafts' },
    4: { code: 'LIBERACAO', label: 'Liberação', defaultDesc: 'Recursos ou carta de crédito liberados com sucesso.', icon: 'account_balance_wallet' }
};

/**
 * Registra um novo evento na linha do tempo do processo
 */
export function addProcessEvent(proposalId, { title, description, icon = 'info' }) {
    const stmt = db.prepare(`
        INSERT INTO process_events (proposal_id, title, description, icon, event_time)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    const result = stmt.run(proposalId, title, description, icon);
    return {
        id: result.lastInsertRowid,
        proposalId,
        title,
        description,
        icon,
        event_time: new Date().toISOString()
    };
}

/**
 * Atualiza o status e etapa de uma proposta e registra o evento correspondente
 */
export function updateProposalStep(proposalId, nextStep, customMessage = null) {
    const stepNumber = Math.min(Math.max(Number(nextStep), 1), 4);
    const meta = STEP_METADATA[stepNumber];
    
    let status = 'EM_ANDAMENTO';
    let statusLabel = 'Em Andamento';

    if (stepNumber === 1) {
        statusLabel = 'Análise Inicial';
    } else if (stepNumber === 4) {
        status = 'CONCLUIDO';
        statusLabel = 'Concluído / Liberado';
    }

    const updateStmt = db.prepare(`
        UPDATE proposals 
        SET current_step = ?, 
            step_name = ?, 
            status = ?, 
            status_label = ?, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);
    updateStmt.run(stepNumber, meta.code, status, statusLabel, proposalId);

    // Registra evento automático de linha do tempo
    const eventDesc = customMessage || meta.defaultDesc;
    addProcessEvent(proposalId, {
        title: `Etapa: ${meta.label}`,
        description: eventDesc,
        icon: meta.icon
    });

    return {
        proposalId,
        currentStep: stepNumber,
        stepName: meta.code,
        status,
        statusLabel
    };
}
