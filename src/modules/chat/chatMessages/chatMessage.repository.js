// modules/chatMessage/chatMessage.repository.js

import { models } from '../../../database/db.js';

const { ChatMessage } = models;

export async function createChatMessage(payload) {
    return ChatMessage.create(payload);
}

export async function deleteChatMessage(id) {
    return ChatMessage.destroy({
        where: { id },
    });
}

export async function getChatMessageById(id) {
    return ChatMessage.findByPk(id);
}

export async function getChatMessages(filters = {}) {
    const where = {};

    if (filters.session_id) {
        where.session_id = filters.session_id;
    }

    if (filters.role) {
        where.role = filters.role;
    }

    return ChatMessage.findAll({
        where,
        order: [['created_at', 'ASC']],
    });
}
