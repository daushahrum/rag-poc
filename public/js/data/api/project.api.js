/**
 * Project API — handles calls to /api/project/*
 */

import { getAuthHeaders } from '../../core/auth/session.js';
import { apiRequest } from './http.js';

export async function createProject(name, code) {
    const data = await apiRequest('/api/project/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ name, code }),
    }, 'Could not create project.');

    return data.project ?? data;
}

export async function updateProject(id, payload) {
    return apiRequest('/api/project/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ id, ...payload }),
    }, 'Could not update project.');
}

export async function deleteProject(id) {
    return apiRequest('/api/project/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ id }),
    }, 'Could not delete project.');
}

export async function fetchProjectEnvironments(projectId) {
    const data = await apiRequest(`/api/project/environments/project/${encodeURIComponent(projectId)}`, {
        headers: getAuthHeaders(),
    }, 'Could not load project environments.');
    return Array.isArray(data) ? data : (data.environments ?? []);
}

async function mutateProjectEnvironment(path, payload) {
    return apiRequest(`/api/project/environments/${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
    }, `Could not ${path} environment.`);
}

export function createProjectEnvironment(payload) {
    return mutateProjectEnvironment('create', payload);
}

export function updateProjectEnvironment(id, payload) {
    return mutateProjectEnvironment('update', { id, ...payload });
}

export function deleteProjectEnvironment(id) {
    return mutateProjectEnvironment('delete', { id });
}

export async function fetchProject(projectId) {
    return apiRequest(`/api/project/${encodeURIComponent(projectId)}`, {
        headers: getAuthHeaders(),
    }, 'Could not load project details.');
}

export async function fetchProjectTopics(projectId) {
    const data = await apiRequest(`/api/project/topics/list?project_id=${encodeURIComponent(projectId)}`, {
        headers: getAuthHeaders(),
    }, 'Could not load project topics.');
    return Array.isArray(data) ? data : (data.topics ?? []);
}

async function mutateProjectTopic(path, payload) {
    return apiRequest(`/api/project/topics/${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
    }, `Could not ${path} topic.`);
}

export function createProjectTopic(payload) {
    return mutateProjectTopic('create', payload);
}

export function updateProjectTopic(id, payload) {
    return mutateProjectTopic('update', { id, ...payload });
}

export function deleteProjectTopic(id) {
    return mutateProjectTopic('delete', { id });
}

export async function fetchProjects() {
    const data = await apiRequest('/api/project/list', {
        headers: getAuthHeaders(),
    }, 'Could not load projects.');
    return Array.isArray(data) ? data : (data.projects ?? []);
}

export async function getProjectUser(userId) {
    return apiRequest(`/api/project/users/find?external_user_id=${encodeURIComponent(userId)}`, {
        headers: getAuthHeaders(),
    }, 'Could not load project user.');
}
