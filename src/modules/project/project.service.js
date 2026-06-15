// modules/project/project.service.js
import crypto from 'crypto';
import * as projectRepository from './project.repository.js';

function generateProjectKeyHash() {
    return crypto.randomBytes(32).toString('hex');
}

export async function createProject(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Project payload is required');
    }

    const { code, name } = payload;

    if (!code) {
        throw new Error('Project code is required');
    }

    if (!name) {
        throw new Error('Project name is required');
    }

    const projectToCreate = {
        ...payload,
        project_key_hash: generateProjectKeyHash(),
        is_active: payload.is_active ?? true,
    };

    return projectRepository.createProject(projectToCreate);
}

export async function deleteProject(id) {
    if (!id) {
        throw new Error('Project id is required');
    }
    return projectRepository.deleteProject(id);
}

export async function updateProject(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Project payload is required');
    }

    const id = payload.id;
    if (!id) {
        throw new Error('Project id is required for update');
    }

    const { code, name, is_active, updated_by } = payload;

    const updatePayload = {
        ...(code !== undefined && { code }),
        ...(name !== undefined && { name }),
        ...(is_active !== undefined && { is_active }),
        ...(updated_by !== undefined && { updated_by }),
    };

    if (Object.keys(updatePayload).length === 0) {
        throw new Error('No updatable fields provided');
    }

    return projectRepository.updateProject(id, updatePayload);
}

export async function getProjects() {
    return projectRepository.getProjects();
}

export async function getProjectById(id) {
    if (!id) {
        throw new Error('Project id is required');
    }
    return projectRepository.getProjectById(id);
}