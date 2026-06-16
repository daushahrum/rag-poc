// modules/projectEnvironment/projectEnvironment.service.js

import * as projectEnvironmentRepository from './projectEnvironment.repository.js';
import * as projectRepository from '../project.repository.js';

export async function createProjectEnvironment(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Project environment payload is required');
    }

    const {
        project_id,
        environment,
        base_url,
        auth_type,
        auth_config,
        is_active,
    } = payload;

    // validate first, before any DB calls
    if (!project_id) {
        throw new Error('Project environment project_id is required');
    }

    if (!environment) {
        throw new Error('Project environment environment is required');
    }

    if (!base_url) {
        throw new Error('Project environment base_url is required');
    }

    // fetch project to get its name
    const project = await projectRepository.getProjectById(project_id);

    if (!project) {
        throw new Error('Project not found');
    }

    const id = `${project.code}_${environment}`.toLowerCase().replace(/\s+/g, '_');

    const projectEnvironmentToCreate = {
        ...payload,
        id,
        auth_type: payload.auth_type ?? 'none',
        is_active: payload.is_active ?? true,
    };

    return projectEnvironmentRepository.createProjectEnvironment(projectEnvironmentToCreate);
}

export async function deleteProjectEnvironment(id) {
    if (!id) {
        throw new Error('Project environment id is required');
    }
    return projectEnvironmentRepository.deleteProjectEnvironment(id);
}

export async function updateProjectEnvironment(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Project environment payload is required');
    }

    const id = payload.id;
    if (!id) {
        throw new Error('Project environment id is required for update');
    }

    const {
        environment,
        base_url,
        auth_type,
        auth_config,
        is_active,
        updated_by,
    } = payload;

    const updatePayload = {
        ...(environment !== undefined && { environment }),
        ...(base_url !== undefined && { base_url }),
        ...(auth_type !== undefined && { auth_type }),
        ...(auth_config !== undefined && { auth_config }),
        ...(is_active !== undefined && { is_active }),
        ...(updated_by !== undefined && { updated_by }),
    };

    if (Object.keys(updatePayload).length === 0) {
        throw new Error('No updatable fields provided');
    }

    return projectEnvironmentRepository.updateProjectEnvironment(id, updatePayload);
}

export async function getProjectEnvironments(filters = {}) {
    return projectEnvironmentRepository.getProjectEnvironments(filters);
}

export async function getProjectEnvironmentById(id) {
    if (!id) {
        throw new Error('Project environment id is required');
    }
    return projectEnvironmentRepository.getProjectEnvironmentById(id);
}

export async function getProjectEnvironmentByProjectId(projectId) {
    if (!projectId) {
        throw new Error('Project id is required');
    }
    return projectEnvironmentRepository.getProjectEnvironmentByProjectId(projectId);
}
