// modules/chatSession/chatSession.repository.js

import { models } from '../../../database/db.js';

const { ChatSessions } = models;

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
