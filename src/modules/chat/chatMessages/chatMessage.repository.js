// modules/chatMessage/chatMessage.repository.js

import { models } from '../../../database/db.js';

const { ChatMessages } = models;

export async function createChatMessage(payload) {
    return ChatMessages.create(payload);
}

export async function updateChatMessage(id, payload) {
    await ChatMessages.update(
        payload,
        {
            where: { id },
        }
    );

    return ChatMessages.findByPk(id);
}

export async function deleteChatMessage(id) {
    return ChatMessages.destroy({
        where: { id },
    });
}

export async function getChatMessageById(id) {
    return ChatMessages.findByPk(id);
}

export async function getChatMessages(filters = {}) {
    const where = {};

    if (filters.session_id) {
        where.session_id = filters.session_id;
    }

    if (filters.role) {
        where.role = filters.role;
    }

    return ChatMessages.findAll({
        where,
        order: [['created_at', 'ASC']],
    });
}
