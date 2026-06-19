/**
 * Chat API — handles calls to /api/chat/*
 */

import { getAuthHeaders } from '../auth.js';

export async function sendMessage(sessionId, message) {
    const TAG = '[chat.api.js sendMessage]';
    const response = await fetch('/api/chat/portal/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({
            session_id: sessionId,
            message,
        }),
    });
    // console.log(TAG, 'response.json: ', response.json)
    // console.log(TAG, 'response.body: ', response.body)

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'The assistant could not answer right now.');
    }

    return response.json();
}

export async function fetchSessions({
    project_id,
    environment_id,
    project_user_id,
} = {}) {
    const params = new URLSearchParams();

    if (project_id) params.set('project_id', project_id);
    if (environment_id) params.set('environment_id', environment_id);
    if (project_user_id) params.set('project_user_id', project_user_id);

    const query = params.toString();
    const url = query ? `/api/chat/sessions/list?${query}` : '/api/chat/sessions/list';

    const response = await fetch(url, {
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not load chat history.');
    }

    const data = await response.json();
    const sessions = Array.isArray(data) ? data : (data.sessions ?? []);

    return sessions.map((session) => ({
        ...session,
        title: session.title ?? session.topic ?? 'Untitled chat',
    }));
}

export async function fetchSessionMessages(sessionId) {
    const response = await fetch(`/api/chat/sessions/${encodeURIComponent(sessionId)}`, {
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not load that chat.');
    }

    const data = await response.json();
    return data.messages ?? [];
}

export async function createChatSession(user, environmentId) {
    const payload = {
        project_id: user.project_id,
        project_user_id: user.project_user_id,
        environment_id: environmentId,
    };

    const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
    };

    // Equivalent curl
    const curl = [
        `curl -X POST "${window.location.origin}/api/chat/sessions/portal/create"`,
        ...Object.entries(headers).map(
            ([key, value]) => `-H "${key}: ${value}"`
        ),
        `-d '${JSON.stringify(payload)}'`,
    ].join(' ');

    console.log('[createChatSession] CURL:');
    console.log(curl);

    const response = await fetch('/api/chat/sessions/portal/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
    });

    const responseBody = await response.clone().json().catch(async () => {
        return await response.clone().text();
    });

    console.log('[createChatSession] Status:', response.status);
    console.log('[createChatSession] Response:', responseBody);

    if (!response.ok) {
        throw new Error(
            responseBody?.error ?? 'Could not start a new chat session.'
        );
    }

    return responseBody;
}
