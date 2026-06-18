// modules/chatSession/chatSession.service.js

import { randomUUID } from 'crypto';
import * as chatSessionRepository from './chatSession.repository.js';
import * as projectRepository from '../../../modules/project/project.repository.js';
import * as projectUserRepository from '../../../modules/project/projectUser/projectUser.repository.js';

export async function createChatSession(payload, isPortalAdmin = false) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Chat session payload is required');
    }

    let { project_id, project_code, environment_id, project_user_id } = payload;

    if (!environment_id) {
        throw new Error('Chat session environment_id is required');
    }

    if (!isPortalAdmin && project_code) {
        const project = await projectRepository.getProjectByCode(project_code);
        if (!project) {
            throw new Error('Project not found');
        }
        project_id = project.id;
    } else if (!project_id) {
        throw new Error('Chat session project_id is required');
    }

    const emptySession = await chatSessionRepository.findEmptySession(project_id, environment_id, project_user_id);
    if (emptySession) {
        console.log('reusing empty chat session:', emptySession.id);
        return emptySession;
    }

    console.log('creating new chat session with isPortalAdmin:', isPortalAdmin);

    const chatSessionToCreate = {
        ...payload,
        project_id,
        project_user_id: project_user_id,
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