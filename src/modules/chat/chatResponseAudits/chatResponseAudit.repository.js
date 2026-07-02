// modules/chatResponseAudit/chatResponseAudit.repository.js

import { Op } from 'sequelize';
import { models, sequelize } from '../../../database/db.js';

const {
    ChatResponseAudits,
    ChatMessages,
    ChatSessions,
    ProjectUser,
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

function buildAuditWhere(filters = {}) {
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

    if (filters.confidence_levels) {
        where.confidence_level = {
            [Op.in]: String(filters.confidence_levels)
                .split(',')
                .map((level) => level.trim())
                .filter(Boolean),
        };
    } else if (filters.confidence_level) {
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

    return where;
}

export async function getChatResponseAudits(filters = {}) {
    const where = buildAuditWhere(filters);

    return ChatResponseAudits.findAll({
        where,
        include: [
            {
                model: ChatMessages,
                as: 'assistant_message',
                required: false,
                attributes: ['id', 'content', 'created_at', 'low_confidence', 'confidence_reasons'],
            },
            {
                model: ChatMessages,
                as: 'user_message',
                required: false,
                attributes: ['id', 'content', 'created_at'],
            },
            {
                model: ChatSessions,
                as: 'chat_session',
                required: false,
                attributes: ['id', 'project_user_id'],
                include: [
                    {
                        model: ProjectUser,
                        as: 'project_user',
                        required: false,
                        attributes: ['id', 'external_user_id'],
                    },
                ],
            },
        ],
        order: [['created_at', 'DESC']],
    });
}

export async function getAuditTopicBreakdown(filters = {}) {
    const rows = await ChatResponseAudits.findAll({
        where: buildAuditWhere(filters),
        attributes: [
            'topic',
            [sequelize.fn('COUNT', sequelize.col('id')), 'query_count'],
            [
                sequelize.fn(
                    'SUM',
                    sequelize.literal("CASE WHEN quality_status = 'normal' THEN 1 ELSE 0 END"),
                ),
                'normal_count',
            ],
            [
                sequelize.fn(
                    'SUM',
                    sequelize.literal("CASE WHEN quality_status = 'needs_review' THEN 1 ELSE 0 END"),
                ),
                'needs_review_count',
            ],
            [
                sequelize.fn(
                    'SUM',
                    sequelize.literal("CASE WHEN quality_status = 'unresolved' THEN 1 ELSE 0 END"),
                ),
                'unresolved_count',
            ],
            [
                sequelize.fn(
                    'SUM',
                    sequelize.literal("CASE WHEN confidence_level IN ('medium', 'low') THEN 1 ELSE 0 END"),
                ),
                'low_confidence_count',
            ],
            [
                sequelize.fn(
                    'SUM',
                    sequelize.literal("CASE WHEN user_feedback = 'positive' THEN 1 ELSE 0 END"),
                ),
                'positive_feedback_count',
            ],
            [
                sequelize.fn(
                    'SUM',
                    sequelize.literal("CASE WHEN user_feedback = 'negative' THEN 1 ELSE 0 END"),
                ),
                'negative_feedback_count',
            ],
        ],
        group: ['topic'],
        order: [[sequelize.literal('query_count'), 'DESC']],
    });

    return rows;
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
