// modules/chatMessage/chatMessage.controller.js

import * as chatMessageService from './chatMessage.service.js';

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
        const chatMessages = await chatMessageService.getChatMessages(req.query);

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