/**
 * Jira API - handles calls to /api/jira/*
 */

import { getAuthHeaders } from '../../core/auth/session.js';

export async function getJiraAuthorizationUrl(projectId) {
    const params = new URLSearchParams({
        project_id: String(projectId),
        format: 'json',
    });

    const response = await fetch(`/api/jira/connect?${params.toString()}`, {
        headers: getAuthHeaders(),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error ?? data.message ?? 'Could not start Jira connection.');
    }

    if (!data.authorizationUrl) {
        throw new Error('Jira authorization URL was not returned.');
    }

    return data.authorizationUrl;
}

export async function getJiraConnection(projectId) {
    const response = await fetch(`/api/jira/${projectId}/connection`, {
        headers: getAuthHeaders(),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(data?.error ?? data?.message ?? 'Could not load Jira connection.');
    }

    return data;
}

export async function disconnectJira(projectId) {
    const response = await fetch(`/api/jira/${projectId}/disconnect`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error ?? data.message ?? 'Could not disconnect Jira.');
    }

    return data;
}

export async function createJiraIssue(projectId, payload) {
    const response = await fetch(`/api/jira/${projectId}/issues`, {
        method: 'POST',
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error ?? data.message ?? 'Could not create Jira issue.');
    }

    return data;
}
