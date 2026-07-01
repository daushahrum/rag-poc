// modules/chatResponseAudit/chatResponseAudit.service.js

import * as chatResponseAuditRepository from './chatResponseAudit.repository.js';
import * as chatMessageRepository from '../chatMessages/chatMessage.repository.js';
import * as chatSessionRepository from '../chatSession/chatSession.repository.js';

const updatableFields = [
    'environment_id',
    'message_id',
    'user_message_id',
    'retrieval_score',
    'retrieved_chunk_count',
    'confidence_level',
    'quality_status',
    'user_feedback',
    'user_feedback_reason',
    'user_feedback_note',
    'audit_reason',
    'reviewed_by',
    'reviewed_at',
];

const allowedQualityStatuses = new Set(['normal', 'needs_review', 'unresolved']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createChatResponseAudit(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Chat response audit payload is required');
    }

    const {
        chat_session_id,
        message_id,
    } = payload;

    if (!chat_session_id) {
        throw new Error('Chat response audit chat_session_id is required');
    }

    if (!message_id) {
        throw new Error('Chat response audit message_id is required');
    }

    validateUuid(chat_session_id, 'chat_session_id');
    validateIntegerId(message_id, 'message_id');
    payload.quality_status = normalizeQualityStatus(payload.quality_status);
    validateQualityStatus(payload.quality_status);

    const session = await chatSessionRepository.getChatSessionById(chat_session_id);

    if (!session) {
        throw new Error('Chat session not found');
    }

    const userMessage = await getPreviousUserMessage(chat_session_id, message_id);

    if (!userMessage) {
        throw new Error('Previous user message not found for chat session');
    }

    const auditPayload = {
        ...payload,
        message_id: Number(message_id),
        project_id: String(session.project_id),
        environment_id: session.environment_id,
        user_message_id: Number(userMessage.id),
    };

    const existingAudits = await chatResponseAuditRepository.getChatResponseAudits({
        chat_session_id,
        message_id,
    });

    if (existingAudits.length > 0) {
        const existingAudit = existingAudits[0];
        const existingAuditId = existingAudit.id ?? existingAudit.get?.('id');
        await chatResponseAuditRepository.updateChatResponseAudit(existingAuditId, auditPayload);
        return chatResponseAuditRepository.getChatResponseAuditById(existingAuditId);
    }

    return chatResponseAuditRepository.createChatResponseAudit(auditPayload);
}

async function getPreviousUserMessage(chatSessionId, assistantMessageId) {
    const messages = await chatMessageRepository.getChatMessages({
        session_id: chatSessionId,
    });

    let assistantIndex = -1;

    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];

        if (message.role === 'assistant' && String(message.id) === String(assistantMessageId)) {
            assistantIndex = index;
            break;
        }
    }

    const searchEnd = assistantIndex === -1 ? messages.length : assistantIndex;

    for (let index = searchEnd - 1; index >= 0; index -= 1) {
        const message = messages[index];

        if (message.role === 'user') {
            return message;
        }
    }

    return null;
}

export async function updateChatResponseAudit(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Chat response audit payload is required');
    }

    const { id } = payload;

    if (!id) {
        throw new Error('Chat response audit id is required for update');
    }

    const updatePayload = {};

    updatableFields.forEach((field) => {
        if (payload[field] !== undefined) {
            updatePayload[field] = payload[field];
        }
    });

    if (Object.keys(updatePayload).length === 0) {
        throw new Error('No updatable fields provided');
    }

    updatePayload.quality_status = normalizeQualityStatus(updatePayload.quality_status);
    validateQualityStatus(updatePayload.quality_status);
    validateOptionalIntegerId(updatePayload.message_id, 'message_id');
    validateOptionalIntegerId(updatePayload.user_message_id, 'user_message_id');

    if (updatePayload.message_id !== undefined && updatePayload.message_id !== null && updatePayload.message_id !== '') {
        updatePayload.message_id = Number(updatePayload.message_id);
    }

    if (updatePayload.user_message_id !== undefined && updatePayload.user_message_id !== null && updatePayload.user_message_id !== '') {
        updatePayload.user_message_id = Number(updatePayload.user_message_id);
    }

    return chatResponseAuditRepository.updateChatResponseAudit(id, updatePayload);
}

function validateQualityStatus(qualityStatus) {
    if (qualityStatus === undefined || qualityStatus === null) {
        return;
    }

    if (!allowedQualityStatuses.has(qualityStatus)) {
        throw new Error('quality_status must be one of: normal, needs_review, unresolved');
    }
}

function normalizeQualityStatus(qualityStatus) {
    if (qualityStatus === 'needs review') {
        return 'needs_review';
    }

    return qualityStatus;
}

function validateUuid(value, fieldName) {
    if (!uuidPattern.test(String(value))) {
        throw new Error(`${fieldName} must be a valid uuid`);
    }
}

function validateIntegerId(value, fieldName) {
    if (!Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
        throw new Error(`${fieldName} must be a valid numeric id`);
    }
}

function validateOptionalIntegerId(value, fieldName) {
    if (value === undefined || value === null || value === '') {
        return;
    }

    validateIntegerId(value, fieldName);
}

export async function deleteChatResponseAudit(id) {
    if (!id) {
        throw new Error('Chat response audit id is required');
    }

    return chatResponseAuditRepository.deleteChatResponseAudit(id);
}

export async function getChatResponseAudits(filters = {}) {
    const audits = await chatResponseAuditRepository.getChatResponseAudits(filters);
    return audits.map(serializeChatResponseAudit);
}

export async function getChatResponseAuditById(id) {
    if (!id) {
        throw new Error('Chat response audit id is required');
    }

    return chatResponseAuditRepository.getChatResponseAuditById(id);
}

function toNumber(value) {
    if (value === null || value === undefined || value === '') {
        return 0;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function toPlainRow(row) {
    return typeof row?.get === 'function' ? row.get({ plain: true }) : row;
}

function serializeChatResponseAudit(row) {
    const audit = toPlainRow(row);
    const sessionProjectUserId = audit.chat_session?.project_user_id ?? null;
    const projectUser = audit.chat_session?.project_user ?? null;
    const projectUserMatchesSession = Boolean(
        sessionProjectUserId
        && projectUser?.id
        && String(sessionProjectUserId) === String(projectUser.id)
    );

    return {
        ...audit,
        project_user_id: sessionProjectUserId,
        user_id: projectUserMatchesSession ? projectUser.external_user_id : null,
    };
}

function normalizeAnalyticsFilters(filters = {}) {
    const normalized = {};

    if (filters.project_id) {
        normalized.project_id = String(filters.project_id);
    }

    if (filters.environment_id) {
        normalized.environment_id = String(filters.environment_id);
    }

    if (filters.days) {
        normalized.days = Math.max(1, Number(filters.days));
    }

    return normalized;
}

function aggregateCounts(rows) {
    const totals = {
        total_audited_queries: 0,
        normal_count: 0,
        needs_review_count: 0,
        unresolved_count: 0,
        high_confidence_count: 0,
        medium_confidence_count: 0,
        low_confidence_count: 0,
        unknown_confidence_count: 0,
        positive_feedback_count: 0,
        negative_feedback_count: 0,
        no_feedback_count: 0,
        average_retrieval_score: null,
        latest_audit_at: null,
    };
    let weightedRetrievalScore = 0;
    let weightedRetrievalCount = 0;

    rows.forEach((row) => {
        const count = toNumber(row.total_audited_queries);

        Object.keys(totals).forEach((key) => {
            if (key === 'average_retrieval_score' || key === 'latest_audit_at') {
                return;
            }

            totals[key] += toNumber(row[key]);
        });

        if (row.average_retrieval_score !== null && row.average_retrieval_score !== undefined) {
            weightedRetrievalScore += toNumber(row.average_retrieval_score) * count;
            weightedRetrievalCount += count;
        }

        if (row.latest_audit_at) {
            const current = totals.latest_audit_at ? new Date(totals.latest_audit_at) : null;
            const candidate = new Date(row.latest_audit_at);

            if (!current || candidate > current) {
                totals.latest_audit_at = row.latest_audit_at;
            }
        }
    });

    totals.average_retrieval_score = weightedRetrievalCount
        ? weightedRetrievalScore / weightedRetrievalCount
        : null;

    return totals;
}

function aggregateStatusBreakdown(rows) {
    const byStatus = new Map();

    rows.forEach((row) => {
        const status = row.quality_status ?? 'unknown';
        byStatus.set(status, (byStatus.get(status) ?? 0) + toNumber(row.query_count));
    });

    return Array.from(byStatus.entries())
        .map(([quality_status, query_count]) => ({
            quality_status,
            query_count,
        }))
        .sort((a, b) => b.query_count - a.query_count);
}

function aggregateDaily(rows) {
    const byDate = new Map();

    rows.forEach((row) => {
        const auditDate = row.audit_date;
        const existing = byDate.get(auditDate) ?? {
            audit_date: auditDate,
            total_audited_queries: 0,
            normal_count: 0,
            needs_review_count: 0,
            unresolved_count: 0,
            low_confidence_count: 0,
            negative_feedback_count: 0,
            average_retrieval_score: null,
            weighted_retrieval_score: 0,
            weighted_retrieval_count: 0,
        };
        const count = toNumber(row.total_audited_queries);

        [
            'total_audited_queries',
            'normal_count',
            'needs_review_count',
            'unresolved_count',
            'low_confidence_count',
            'negative_feedback_count',
        ].forEach((key) => {
            existing[key] += toNumber(row[key]);
        });

        if (row.average_retrieval_score !== null && row.average_retrieval_score !== undefined) {
            existing.weighted_retrieval_score += toNumber(row.average_retrieval_score) * count;
            existing.weighted_retrieval_count += count;
        }

        byDate.set(auditDate, existing);
    });

    return Array.from(byDate.values())
        .map((row) => ({
            audit_date: row.audit_date,
            total_audited_queries: row.total_audited_queries,
            normal_count: row.normal_count,
            needs_review_count: row.needs_review_count,
            unresolved_count: row.unresolved_count,
            low_confidence_count: row.low_confidence_count,
            negative_feedback_count: row.negative_feedback_count,
            average_retrieval_score: row.weighted_retrieval_count
                ? row.weighted_retrieval_score / row.weighted_retrieval_count
                : null,
        }))
        .sort((a, b) => String(b.audit_date).localeCompare(String(a.audit_date)));
}

export async function getQueryQualityAnalytics(filters = {}) {
    const normalizedFilters = normalizeAnalyticsFilters(filters);
    const [countsRows, dailyRows, statusRows] = await Promise.all([
        chatResponseAuditRepository.getQueryQualityCounts(normalizedFilters),
        chatResponseAuditRepository.getQueryQualityDaily({
            ...normalizedFilters,
            days: normalizedFilters.days ?? 14,
        }),
        chatResponseAuditRepository.getQueryQualityStatusBreakdown(normalizedFilters),
    ]);

    const counts = countsRows.map(toPlainRow);
    const daily = dailyRows.map(toPlainRow);
    const statuses = statusRows.map(toPlainRow);

    return {
        filters: normalizedFilters,
        counts: aggregateCounts(counts),
        status_breakdown: aggregateStatusBreakdown(statuses),
        daily: aggregateDaily(daily),
        groups: counts,
    };
}
