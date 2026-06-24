// modules/chatSession/chatSession.controller.js

import * as chatSessionService from './chatSession.service.js';
import * as projectUserService from '../../project/projectUser/projectUser.service.js';

export async function createChatSession(req, res) {
    try {
        const payload = {
            ...req.body,
        };

        const routeSource = req.routeSource || (req.headers.authorization ? 'portal' : 'public');
        const isPortalAdmin = routeSource === 'portal';

        if (isPortalAdmin && req.token) {
            payload.user_id = req.token.id;
        }

        console.log('calling createChatSession with\nrouteSource:', routeSource, '\nisPortalAdmin:', isPortalAdmin);

        const chatSession = await chatSessionService.createChatSession(payload, isPortalAdmin);

        return res.json(chatSession);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function updateChatSession(req, res) {
    try {
        const payload = {
            ...req.body,
        };

        await chatSessionService.updateChatSession(payload);

        return res.status(200).json({
            message: 'Chat session updated',
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function deleteChatSession(req, res) {
    try {
        await chatSessionService.deleteChatSession(req.body.id);

        return res.status(200).json({
            message: 'Chat session deleted',
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function listChatSession(req, res) {
    try {
        const routeSource = req.routeSource || (req.headers.authorization ? 'portal' : 'public');
        const filters = {
            ...req.query,
        };

        if (routeSource === 'public') {
            if (!req.project) {
                throw new Error('Project context is required');
            }

            if (!filters.user_id) {
                throw new Error('user_id is required');
            }

            const projectUser = await projectUserService.getProjectUserByExternalUserId(
                req.project.id,
                filters.user_id,
            );

            if (!projectUser) {
                return res.json([]);
            }

            filters.project_id = req.project.id;
            filters.project_user_id = projectUser.id;
            delete filters.user_id;
            delete filters.project_code;
        }

        const chatSessions = await chatSessionService.getChatSessions(filters);

        return res.json(chatSessions);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function getChatSession(req, res) {
    try {
        const chatSession = await chatSessionService.getChatSessionById(req.params.id);

        return res.json(chatSession);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}
