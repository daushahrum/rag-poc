// modules/chatMessage/chatMessage.controller.js

import * as chatMessageService from './chatMessage.service.js';
import * as chatSessionService from '../chatSession/chatSession.service.js';
import * as projectUserService from '../../project/projectUser/projectUser.service.js';

export async function createChatMessage(req, res) {
    try {
        const chatMessage = await chatMessageService.createChatMessage(req.body);

        return res.json(chatMessage);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function deleteChatMessage(req, res) {
    try {
        await chatMessageService.deleteChatMessage(req.body.id);

        return res.status(200).json({
            message: 'Chat message deleted',
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function listChatMessage(req, res) {
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

            if (!filters.session_id) {
                throw new Error('session_id is required');
            }

            const projectUser = await projectUserService.getProjectUserByExternalUserId(
                req.project.id,
                filters.user_id,
            );

            if (!projectUser) {
                return res.json([]);
            }

            const session = await chatSessionService.getChatSessionById(filters.session_id);

            if (!session) {
                return res.json([]);
            }

            if (
                session.project_id !== req.project.id ||
                session.project_user_id !== projectUser.id
            ) {
                return res.json([]);
            }

            delete filters.user_id;
            delete filters.project_code;
        }

        const chatMessages = await chatMessageService.getChatMessages(filters);

        return res.json(chatMessages);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function getChatMessage(req, res) {
    try {
        const chatMessage = await chatMessageService.getChatMessageById(req.params.id);

        return res.json(chatMessage);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}
