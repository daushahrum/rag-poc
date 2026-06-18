// modules/chatSession/chatSession.service.js

import { randomUUID } from 'crypto';
import * as chatSessionRepository from './chatSession.repository.js';

export async function createChatSession(payload, isPortalAdmin = false) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Chat session payload is required');
    }

    const { project_id, environment_id } = payload;

    if (!project_id) {
        throw new Error('Chat session project_id is required');
    }

    if (!environment_id) {
        throw new Error('Chat session environment_id is required');
    }

    console.log('creating chat session with isPortalAdmin:', isPortalAdmin);

    const chatSessionToCreate = {
        ...payload,
        id: randomUUID(),
    };

    return chatSessionRepository.createChatSession(chatSessionToCreate);
}

export async function deleteChatSession(id) {
    if (!id) {
        throw new Error('Chat session id is required');
    }
    return chatSessionRepository.deleteChatSession(id);
}

export async function updateChatSession(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Chat session payload is required');
    }

    const id = payload.id;
    if (!id) {
        throw new Error('Chat session id is required for update');
    }

    const { topic } = payload;

    const updatePayload = {
        ...(topic !== undefined && { topic }),
    };

    if (Object.keys(updatePayload).length === 0) {
        throw new Error('No updatable fields provided');
    }

    return chatSessionRepository.updateChatSession(id, updatePayload);
}

export async function getChatSessions(filters = {}) {
    return chatSessionRepository.getChatSessions(filters);
}

export async function getChatSessionById(id) {
    if (!id) {
        throw new Error('Chat session id is required');
    }
    return chatSessionRepository.getChatSessionById(id);
}