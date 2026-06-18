// modules/chatSession/chatSession.repository.js

import { models } from '../../../database/db.js';
import { Op } from 'sequelize';

const { ChatSessions, ChatMessages } = models;

export async function createChatSession(payload) {
    return ChatSessions.create(payload);
}

export async function updateChatSession(id, payload) {
    const [affectedRows] = await ChatSessions.update(
        payload,
        {
            where: { id },
        }
    );

    return affectedRows;
}

export async function deleteChatSession(id) {
    return ChatSessions.destroy({
        where: { id },
    });
}

export async function getChatSessionById(id) {
    return ChatSessions.findByPk(id);
}

export async function getChatSessions(filters = {}) {
    const where = {};

    if (filters.project_id) {
        where.project_id = filters.project_id;
    }

    if (filters.environment_id) {
        where.environment_id = filters.environment_id;
    }

    if (filters.project_user_id) {
        where.project_user_id = filters.project_user_id;
    }

    return ChatSessions.findAll({
        where,
        order: [['created_at', 'DESC']],
    });
}

export async function findEmptySession(projectId, environmentId, externalUserId) {
    if (externalUserId === undefined || externalUserId === null) {
        // No stable identity to scope to — can't safely reuse anything.
        return null;
    }

    const sessions = await ChatSessions.findAll({
        where: {
            project_id: projectId,
            environment_id: environmentId,
            project_user_id: externalUserId,
        },
    });

    for (const session of sessions) {
        const messageCount = await ChatMessages.count({
            where: { session_id: session.id },
        });

        if (messageCount === 0) {
            return session;
        }
    }

    return null;
}
