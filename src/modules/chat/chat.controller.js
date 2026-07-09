// modules/chat/chat.controller.js

import * as chatService from './chat.service.js';
import { serializePublicChatMessage } from './chatMessage.serializer.js';
import { redactSensitive, safeRedactedJson } from '../../utils/redact.js';

export async function sendMessage(req, res) {

    console.log(`
    curl -X ${req.method} "${req.protocol}://${req.get('host')}${req.originalUrl}" \
    -H "Authorization: ${redactSensitive(req.headers.authorization || '')}" \
    -H "X-Project-Token: ${req.headers['x-project-key'] ? '[REDACTED]' : ''}" \
    -H "Content-Type: application/json" \
    -d '${safeRedactedJson(req.body)}'
    `);

    try {
        const { session_id, message } = req.body;
        const routeSource = req.routeSource || (req.token ? 'portal' : 'public');
        const isPortalAdmin = routeSource === 'portal';
        const userToken = req.headers.authorization;
        console.log('calling send message with\nuser token:', redactSensitive(userToken), '\nisPortalAdmin:', isPortalAdmin);
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

export async function sendMessageStream(req, res) {
    const abortController = new AbortController();
    let completed = false;

    req.on('close', () => {
        if (!completed) {
            abortController.abort();
        }
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (event) => {
        if (res.writableEnded || res.destroyed || abortController.signal.aborted) {
            return false;
        }

        res.write(`data: ${JSON.stringify(event)}\n\n`);
        return true;
    };

    try {
        const { session_id, message } = req.body;
        const routeSource = req.routeSource || (req.token ? 'portal' : 'public');
        const isPortalAdmin = routeSource === 'portal';
        const userToken = req.headers.authorization;

        await chatService.sendMessageStream(session_id, message, userToken, isPortalAdmin, {
            sendEvent,
            signal: abortController.signal,
        });
    } catch (error) {
        console.error('Failed to handle chat stream:', redactSensitive(error.message));
        sendEvent({ type: 'error', message: 'Failed to generate response' });
    } finally {
        completed = true;

        if (!res.writableEnded && !res.destroyed) {
            res.end();
        }
    }
}
