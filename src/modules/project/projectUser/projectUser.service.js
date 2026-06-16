// modules/projectUser/projectUser.service.js

import * as projectUserRepository from './projectUser.repository.js';

export async function createProjectUser(payload) {

    const {
        project_id,
        external_user_id,
    } = payload;

    if (!project_id) {
        throw new Error('Project ID is required');
    }

    if (!external_user_id) {
        throw new Error('External User ID is required');
    }

    return projectUserRepository.createProjectUser(payload);
}

export async function deleteProjectUser(id) {
    return projectUserRepository.deleteProjectUser(id);
}

export async function updateProjectUser(id, payload) {

    if (!id) {
        throw new Error('Project User ID is required');
    }

    return projectUserRepository.updateProjectUser(
        id,
        payload,
    );
}

export async function getProjectUsers() {
    return projectUserRepository.getProjectUsers();
}

export async function getProjectUserById(id) {
    return projectUserRepository.getProjectUserById(id);
}

export async function getProjectUserByExternalUserId(
    projectId,
    externalUserId,
) {
    return projectUserRepository.getProjectUserByExternalUserId(
        projectId,
        externalUserId,
    );
}

export async function findOrCreateProjectUser(
    projectId,
    externalUserId,
    payload = {},
) {
    let projectUser =
        await projectUserRepository.getProjectUserByExternalUserId(
            projectId,
            externalUserId,
        );

    if (!projectUser) {
        projectUser =
            await projectUserRepository.createProjectUser({
                project_id: projectId,
                external_user_id: externalUserId,
                ...payload,
            });
    }

    return projectUser;
}