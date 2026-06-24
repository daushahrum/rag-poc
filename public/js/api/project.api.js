/**
 * Project API — handles calls to /api/project/*
 */

import { getAuthHeaders } from '../auth.js';

export async function createProject(name, code) {
    const response = await fetch('/api/project/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ name, code }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error ?? data.message ?? 'Could not create project.');
    }

    return data.project ?? data;
}

export async function fetchProjectEnvironments(projectId) {
    const response = await fetch(`/api/project/environments/project/${encodeURIComponent(projectId)}`, {
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not load project environments.');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : (data.environments ?? []);
}

export async function fetchProject(projectId) {
    const response = await fetch(`/api/project/${encodeURIComponent(projectId)}`, {
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? data.message ?? 'Could not load project details.');
    }

    return response.json();
}

export async function fetchProjects() {
    const response = await fetch('/api/project/list', {
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? data.message ?? 'Could not load projects.');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : (data.projects ?? []);
}

export async function getProjectUser(userId) {
    const response = await fetch(`/api/project/users/find?external_user_id=${encodeURIComponent(userId)}`, {
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not load project user.');
    }

    const data = await response.json();
    return data;
}
