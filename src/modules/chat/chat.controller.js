// modules/chat/chat.controller.js

import * as chatService from './chat.service.js';

export async function sendMessage(req, res) {
    try {
        const { session_id, message } = req.body;

        const result = await chatService.sendMessage(session_id, message);

        return res.json(result);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}