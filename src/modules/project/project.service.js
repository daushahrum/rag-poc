// modules/user/user.service.js
import * as projectRepository from './project.repository.js';

export async function createProject(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Project payload is required');
    }

    const {
        id,
        name,
        description,
        owner_id,
        created_by,
        updated_by,
        // add any other project model fields here
    } = payload;

    if (!name) {
        throw new Error('Project name is required');
    }

    if (!owner_id) {
        throw new Error('Project owner_id is required');
    }

    // build saved object (preserve any extra fields passed in payload)
    const projectToCreate = {
        ...payload,
        active: payload.active ?? true,
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

    // Optionally pick allowed updatable fields to avoid accidental writes
    const {
        name,
        description,
        owner_id,
        updated_by,
        // add other updatable fields here
    } = payload;

    const updatePayload = {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(owner_id !== undefined && { owner_id }),
        ...(updated_by !== undefined && { updated_by }),
        // include other fields as needed
    };

    // If no updatable fields present, return early or throw
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
