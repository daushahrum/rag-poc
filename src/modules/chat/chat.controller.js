// modules/chat/chat.controller.js

import * as chatService from './chat.service.js';
import { serializePublicChatMessage } from './chatMessage.serializer.js';

export async function sendMessage(req, res) {

    console.log(`
    curl -X ${req.method} "${req.protocol}://${req.get('host')}${req.originalUrl}" \
    -H "Authorization: ${req.headers.authorization || ''}" \
    -H "X-Project-Token: ${req.headers['x-project-key'] || ''}" \
    -H "Content-Type: application/json" \
    -d '${JSON.stringify(req.body)}'
    `);

    try {
        const { session_id, message } = req.body;
        const routeSource = req.routeSource || (req.token ? 'portal' : 'public');
        const isPortalAdmin = routeSource === 'portal';
        const userToken = req.headers.authorization;
        console.log('calling send message with\nuser token:', userToken, '\nisPortalAdmin:',isPortalAdmin)
        const result = await chatService.sendMessage(session_id, message, userToken, isPortalAdmin);

        return res.json(
            routeSource === 'public'
                ? serializePublicChatMessage(result)
                : result
        );
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}
