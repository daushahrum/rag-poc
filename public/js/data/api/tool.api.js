/**
 * Tool API — handles calls to /api/tool/*
 */

import { getAuthHeaders } from '../../core/auth/session.js';
import { apiRequest } from './http.js';

async function request(path, options = {}) {
    return apiRequest(`/api/tool/${path}`, {
        ...options,
        headers: {
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...getAuthHeaders(),
            ...options.headers,
        },
    }, 'Tool request failed.');
}

export function fetchProjectTools(projectId) {
    return request(`list?project_id=${encodeURIComponent(projectId)}`);
}

export function createTool(payload) {
    return request('create', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function updateTool(id, payload) {
    return request('update', {
        method: 'POST',
        body: JSON.stringify({ id, ...payload }),
    });
}

export function deleteTool(id) {
    return request('delete', {
        method: 'POST',
        body: JSON.stringify({ id }),
    });
}
