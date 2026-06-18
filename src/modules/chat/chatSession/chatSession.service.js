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
        user_id,
    } = payload;

    if (!environment_id) {
        throw new Error("Chat session environment_id is required");
    }

    if (!user_id) {
        throw new Error("Chat session user_id is required");
    }

    // Resolve project
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

    let resolvedProjectUserId;

    if (!isPortalAdmin) {
        let projectUser = await projectUserRepository.getProjectUser({
            external_user_id: user_id,
        });

        if (!projectUser) {
            projectUser = await projectUserRepository.createProjectUser({
                id: `${project_code}_${user_id}`,
                project_id,
                external_user_id: user_id,
                user_type: "external",
            });

            console.log("created project user:", projectUser.id);
        } else {
            console.log("user registered:", projectUser.id);
        }

        // Store actual project_users.id in chat_sessions
        resolvedProjectUserId = projectUser.id;
    } else {
        let portal_user_project_id = await projectUserRepository.getProjectUser({external_user_id:user_id});
        console.log(portal_user_project_id)
        resolvedProjectUserId = portal_user_project_id.id;
    }

    const emptySession = await chatSessionRepository.findEmptySession(
        project_id,
        environment_id,
        resolvedProjectUserId
    );

    if (emptySession) {
        console.log("reusing empty chat session:", emptySession.id);
        return emptySession;
    }

    const chatSessionToCreate = {
        id: randomUUID(),
        project_id,
        environment_id,
        project_user_id: resolvedProjectUserId,
    };

    console.log("creating chat session:", chatSessionToCreate);

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