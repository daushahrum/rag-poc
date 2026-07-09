/**
 * Jira API - handles calls to /api/jira/*
 */

import { getAuthHeaders } from '../../core/auth/session.js';
import { apiRequest } from './http.js';

export async function getJiraAuthorizationUrl(projectId) {
    const params = new URLSearchParams({
        project_id: String(projectId),
        format: 'json',
    });

    const data = await apiRequest(`/api/jira/connect?${params.toString()}`, {
        headers: getAuthHeaders(),
    }, 'Could not start Jira connection.');

    if (!data.authorizationUrl) {
        throw new Error('Jira authorization URL was not returned.');
    }

    return data.authorizationUrl;
}

export async function getJiraConnection(projectId) {
    return apiRequest(`/api/jira/${projectId}/connection`, {
        headers: getAuthHeaders(),
    }, 'Could not load Jira connection.');
}

export async function disconnectJira(projectId) {
    return apiRequest(`/api/jira/${projectId}/disconnect`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    }, 'Could not disconnect Jira.');
}

export async function createJiraIssue(projectId, payload) {
    return apiRequest(`/api/jira/${projectId}/issues`, {
        method: 'POST',
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    }, 'Could not create Jira issue.');
}
