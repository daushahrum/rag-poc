// modules/chatResponseAudit/chatResponseAudit.controller.js

import * as chatResponseAuditService from './chatResponseAudit.service.js';

export async function createChatResponseAudit(req, res) {
    try {
        const routeSource = req.routeSource || (req.headers.authorization ? 'portal' : 'public');
        const payload = {
            ...req.body,
        };

        if (routeSource === 'public') {
            if (!req.chatSession) {
                throw new Error('Chat session context is required');
            }

            payload.chat_session_id = req.chatSession.id;
            delete payload.project_code;
            delete payload.project_id;
        }

        const chatResponseAudit = await chatResponseAuditService.createChatResponseAudit(payload);

        return res.json(chatResponseAudit);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function updateChatResponseAudit(req, res) {
    try {
        const payload = {
            ...req.body,
        };

        if (req.token?.id && payload.reviewed_by === undefined) {
            payload.reviewed_by = req.token.id;
        }

        await chatResponseAuditService.updateChatResponseAudit(payload);

        return res.status(200).json({
            message: 'Chat response audit updated',
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function deleteChatResponseAudit(req, res) {
    try {
        await chatResponseAuditService.deleteChatResponseAudit(req.body.id);

        return res.status(200).json({
            message: 'Chat response audit deleted',
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function listChatResponseAudit(req, res) {
    try {
        const chatResponseAudits = await chatResponseAuditService.getChatResponseAudits(req.query);

        return res.json(chatResponseAudits);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function getQueryQualityAnalytics(req, res) {
    try {
        const analytics = await chatResponseAuditService.getQueryQualityAnalytics(req.query);

        return res.json(analytics);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function getChatResponseAudit(req, res) {
    try {
        const chatResponseAudit = await chatResponseAuditService.getChatResponseAuditById(req.params.id);

        return res.json(chatResponseAudit);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}
