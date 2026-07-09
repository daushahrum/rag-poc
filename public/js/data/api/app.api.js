import { getAuthHeaders } from '../../core/auth/session.js';
import { apiRequest } from './http.js';

async function mutateApp(path, payload) {
    return apiRequest(`/api/apps/${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
    }, `Could not ${path} app.`);
}

export function createApp(payload) {
    return mutateApp('create', payload);
}

export function updateApp(id, payload) {
    return mutateApp('update', { id, ...payload });
}

export function deleteApp(id) {
    return mutateApp('delete', { id });
}

export async function fetchProjectApps(projectId) {
    const params = new URLSearchParams();
    if (projectId) {
        params.set('project_id', projectId);
    }

    const data = await apiRequest(`/api/apps/list?${params.toString()}`, {
        headers: getAuthHeaders(),
    }, 'Could not load connected apps.');
    return Array.isArray(data) ? data : (data.apps ?? []);
}
