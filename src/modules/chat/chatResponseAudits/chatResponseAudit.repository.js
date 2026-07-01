// modules/chatResponseAudit/chatResponseAudit.repository.js

import { Op } from 'sequelize';
import { models } from '../../../database/db.js';

const {
    ChatResponseAudits,
    QueryQualityCounts,
    QueryQualityDaily,
    QueryQualityStatusBreakdown,
} = models;

export async function createChatResponseAudit(payload) {
    return ChatResponseAudits.create(payload);
}

export async function updateChatResponseAudit(id, payload) {
    const [affectedRows] = await ChatResponseAudits.update(
        payload,
        {
            where: { id },
        }
    );

    return affectedRows;
}

export async function deleteChatResponseAudit(id) {
    return ChatResponseAudits.destroy({
        where: { id },
    });
}

export async function getChatResponseAuditById(id) {
    return ChatResponseAudits.findByPk(id);
}

export async function getChatResponseAudits(filters = {}) {
    const where = {};

    if (filters.project_id) {
        where.project_id = filters.project_id;
    }

    if (filters.environment_id) {
        where.environment_id = filters.environment_id;
    }

    if (filters.chat_session_id) {
        where.chat_session_id = filters.chat_session_id;
    }

    if (filters.message_id) {
        where.message_id = filters.message_id;
    }

    if (filters.user_message_id) {
        where.user_message_id = filters.user_message_id;
    }

    if (filters.confidence_level) {
        where.confidence_level = filters.confidence_level;
    }

    if (filters.quality_status) {
        where.quality_status = filters.quality_status;
    }

    if (filters.user_feedback) {
        where.user_feedback = filters.user_feedback;
    }

    if (filters.reviewed_by) {
        where.reviewed_by = filters.reviewed_by;
    }

    return ChatResponseAudits.findAll({
        where,
        order: [['created_at', 'DESC']],
    });
}

function buildQualityViewWhere(filters = {}) {
    const where = {};

    if (filters.project_id) {
        where.project_id = filters.project_id;
    }

    if (filters.environment_id) {
        where.environment_id = filters.environment_id;
    }

    return where;
}

export async function getQueryQualityCounts(filters = {}) {
    return QueryQualityCounts.findAll({
        where: buildQualityViewWhere(filters),
        order: [
            ['project_id', 'ASC'],
            ['environment_id', 'ASC'],
        ],
    });
}

export async function getQueryQualityDaily(filters = {}) {
    const where = buildQualityViewWhere(filters);

    if (filters.days) {
        const days = Math.max(1, Number(filters.days));
        const since = new Date();
        since.setDate(since.getDate() - (days - 1));
        where.audit_date = {
            [Op.gte]: since.toISOString().slice(0, 10),
        };
    }

    return QueryQualityDaily.findAll({
        where,
        order: [['audit_date', 'DESC']],
        limit: filters.limit ? Number(filters.limit) : undefined,
    });
}

export async function getQueryQualityStatusBreakdown(filters = {}) {
    return QueryQualityStatusBreakdown.findAll({
        where: buildQualityViewWhere(filters),
        order: [
            ['query_count', 'DESC'],
            ['quality_status', 'ASC'],
        ],
    });
}
