// modules/chatSession/chatSession.service.js

import { randomUUID } from 'crypto';
import * as chatSessionRepository from './chatSession.repository.js';
import * as projectRepository from '../../../modules/project/project.repository.js';
import * as projectUserRepository from '../../../modules/project/projectUser/projectUser.repository.js';
import { where } from 'sequelize';

export async function createChatSession(payload, isPortalAdmin = false) {
    if (!payload || typeof payload !== "object") {
        throw new Error("Chat session payload is required");
    }

    let {
        project_id,
        project_code,
        environment_id,
        project_user_id,
    } = payload;

    if (!environment_id) {
        throw new Error("Chat session environment_id is required");
    }

    // Resolve project first
    if (!project_id) {
        if (!project_code) {
            throw new Error("Either project_id or project_code is required");
        }

        const project = await projectRepository.getProjectByCode(project_code);

        if (!project) {
            throw new Error("Project not found");
        }

        project_id = project.id;
    }

    // Find existing user
    let projectUser = await projectUserRepository.getProjectUser({
        external_user_id: project_user_id,
    });

    // Create if not exists
    if (!projectUser) {
        projectUser = await projectUserRepository.createProjectUser({
            id: `${project_code}_${project_user_id}`,
            project_id,
            external_user_id: project_user_id,
            user_type: "external",
        });

        console.log("created project user:", projectUser.id);
    } else {
        console.log("user registered:", projectUser.id);
    }

    // Reuse empty session
    const emptySession = await chatSessionRepository.findEmptySession(
        project_id,
        environment_id,
        projectUser.id
    );

    if (emptySession) {
        console.log("reusing empty chat session:", emptySession.id);
        return emptySession;
    }

    console.log(
        "creating new chat session with isPortalAdmin:",
        isPortalAdmin
    );

    const chatSessionToCreate = {
        ...payload,
        id: randomUUID(),
        project_id,

        project_user_id: projectUser.id,
    };

    console.log("chatSessionToCreate:", chatSessionToCreate);

    return await chatSessionRepository.createChatSession(
        chatSessionToCreate
    );
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