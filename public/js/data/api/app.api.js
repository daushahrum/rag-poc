import { getAuthHeaders } from '../../core/auth/session.js';

async function mutateApp(path, payload) {
    const response = await fetch(`/api/apps/${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error ?? data.message ?? `Could not ${path} app.`);
    }
    return data;
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

    const response = await fetch(`/api/apps/list?${params.toString()}`, {
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? data.message ?? 'Could not load connected apps.');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : (data.apps ?? []);
}
