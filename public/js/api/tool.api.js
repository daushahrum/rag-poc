/**
 * Tool API — handles calls to /api/tool/*
 */

import { getAuthHeaders } from '../auth.js';

async function request(path, options = {}) {
    const response = await fetch(`/api/tool/${path}`, {
        ...options,
        headers: {
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...getAuthHeaders(),
            ...options.headers,
        },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error ?? data.message ?? 'Tool request failed.');
    }
    return data;
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
