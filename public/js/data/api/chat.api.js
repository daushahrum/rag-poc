/**
 * Chat API — handles calls to /api/chat/*
 */

import { getAuthHeaders } from '../../core/auth/session.js';
import { apiRequest } from './http.js';

export async function sendMessage(sessionId, message) {
    return apiRequest('/api/chat/portal/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({
            session_id: sessionId,
            message,
        }),
    }, 'The assistant could not answer right now.');
}

export async function fetchSessions({
    project_id,
    project_user_id,
    environment_id,
} = {}) {
    const params = new URLSearchParams();

    if (project_id) params.set('project_id', project_id);
    if (project_user_id) params.set('project_user_id', project_user_id);
    if (environment_id) params.set('environment_id', environment_id);

    //call project api


    const query = params.toString();
    const url = query ? `/api/chat/sessions/list?${query}` : '/api/chat/sessions/list';

    const data = await apiRequest(url, {
        headers: getAuthHeaders(),
    }, 'Could not load chat history.');
    const sessions = Array.isArray(data) ? data : (data.sessions ?? []);

    return sessions.map((session) => ({
        ...session,
        title: session.title ?? session.topic ?? 'New chat',
    }));
}

export async function fetchSessionMessages(sessionId) {
    const data = await apiRequest(`/api/chat/messages/list?session_id=${encodeURIComponent(sessionId)}`, {
        headers: getAuthHeaders(),
    }, 'Could not load that chat.');
    return data ?? [];
}

export async function createChatSession(user, environmentId) {
    const payload = {
        project_id: user.project_id,
        project_user_id: user.project_user_id,
        environment_id: environmentId,
    };

    return apiRequest('/api/chat/sessions/portal/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
    }, 'Could not start a new chat session.');
}

export async function createChatResponseAudit(payload) {
    return apiRequest('/api/chat/response-audits/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
    }, 'Could not save response feedback.');
}

export async function fetchQueryQualityAnalytics({
    project_id,
    environment_id,
    days,
} = {}) {
    const params = new URLSearchParams();

    if (project_id) params.set('project_id', project_id);
    if (environment_id) params.set('environment_id', environment_id);
    if (days) params.set('days', days);

    const query = params.toString();
    const url = query
        ? `/api/chat/response-audits/analytics?${query}`
        : '/api/chat/response-audits/analytics';

    return apiRequest(url, {
        headers: getAuthHeaders(),
    }, 'Could not load analytics.');
}

export async function fetchChatResponseAudits(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.set(key, value);
        }
    });

    const query = params.toString();
    const url = query
        ? `/api/chat/response-audits/list?${query}`
        : '/api/chat/response-audits/list';

    const data = await apiRequest(url, {
        headers: getAuthHeaders(),
    }, 'Could not load response audits.');
    return Array.isArray(data) ? data : [];
}
