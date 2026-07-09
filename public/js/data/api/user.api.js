/**
 * User API — handles calls to /api/user/*
 */

import { getAuthHeaders } from '../../core/auth/session.js';
import { apiRequest } from './http.js';

async function request(path, options = {}) {
    return apiRequest(`/api/user/${path}`, {
        ...options,
        headers: {
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...getAuthHeaders(),
            ...options.headers,
        },
    }, 'User request failed.');
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
