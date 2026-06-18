// modules/chatSession/chatSession.controller.js

import * as chatSessionService from './chatSession.service.js';

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
        const chatSessions = await chatSessionService.getChatSessions(req.query);

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