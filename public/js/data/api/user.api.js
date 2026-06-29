/**
 * User API — handles calls to /api/user/*
 */

import { getAuthHeaders } from '../../core/auth/session.js';

async function request(path, options = {}) {
    const response = await fetch(`/api/user/${path}`, {
        ...options,
        headers: {
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...getAuthHeaders(),
            ...options.headers,
        },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message ?? data.error ?? 'User request failed.');
    }

    return data;
}

export function createUser(payload) {
    return request('create', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function fetchUsers(projectId) {
    const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
    return request(`list${query}`);
}

export function updateUser(id, payload) {
    return request('update', {
        method: 'POST',
        body: JSON.stringify({ id, ...payload }),
    });
}

export function deleteUser(id) {
    return request('delete', {
        method: 'POST',
        body: JSON.stringify({ id }),
    });
}
