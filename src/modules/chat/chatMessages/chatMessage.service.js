// modules/chatMessage/chatMessage.service.js

import * as chatMessageRepository from './chatMessage.repository.js';

export async function createChatMessage(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Chat message payload is required');
    }

    const { session_id, role, content } = payload;

    if (!session_id) {
        throw new Error('Chat message session_id is required');
    }

    if (!role) {
        throw new Error('Chat message role is required');
    }

    if (!['user', 'assistant', 'system'].includes(role)) {
        throw new Error('Chat message role must be user, assistant, or system');
    }

    if (!content) {
        throw new Error('Chat message content is required');
    }

    return chatMessageRepository.createChatMessage(payload);
}

export async function updateChatMessage(id, payload) {
    if (!id) {
        throw new Error('Chat message id is required');
    }

    if (!payload || typeof payload !== 'object') {
        throw new Error('Chat message payload is required');
    }

    return chatMessageRepository.updateChatMessage(id, payload);
}

export async function deleteChatMessage(id) {
    if (!id) {
        throw new Error('Chat message id is required');
    }
    return chatMessageRepository.deleteChatMessage(id);
}

export async function getChatMessages(filters = {}) {
    return chatMessageRepository.getChatMessages(filters);
}

export async function getChatMessageById(id) {
    if (!id) {
        throw new Error('Chat message id is required');
    }
    return chatMessageRepository.getChatMessageById(id);
}
