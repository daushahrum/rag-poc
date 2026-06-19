/**
 * Chat API — handles calls to /api/chat/*
 */

import { getAuthHeaders } from '../auth.js';

export async function sendMessage(sessionId, message) {
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

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'The assistant could not answer right now.');
    }

    return response.json();
}

export async function fetchSessions() {
    const response = await fetch('/api/chat/sessions/list', {
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not load chat history.');
    }

    const data = await response.json();
    return data.sessions ?? [];
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

export async function createChatSession(projectId, environmentId) {
    const response = await fetch('/api/chat/sessions/portal/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({
            project_id: projectId,
            environment_id: environmentId,
        }),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not start a new chat session.');
    }

    return response.json();
}
