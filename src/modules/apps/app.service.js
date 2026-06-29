import * as appRepository from './app.repository.js';
import * as projectRepository from '../project/project.repository.js';
import { generateProjectKey, hashProjectKey } from '../../utils/keyUtils.js';

function serializeAppWithKey(app, projectKey) {
    const serialized = app?.toJSON ? app.toJSON() : app;
    if (!projectKey) {
        return serialized;
    }

    return {
        ...serialized,
        project_key: projectKey,
    };
}

export async function createApp(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('App payload is required');
    }

    const {
        project_id,
        name,
        platform,
        project_key,
        project_key_hash,
        status,
    } = payload;

    if (!project_id) {
        throw new Error('App project_id is required');
    }

    if (!name) {
        throw new Error('App name is required');
    }

    if (!platform) {
        throw new Error('App platform is required');
    }

    const project = await projectRepository.getProjectById(project_id);

    if (!project) {
        throw new Error('Project not found');
    }

    const rawProjectKey = project_key_hash ? project_key : (project_key || generateProjectKey());
    const appToCreate = {
        project_id,
        name,
        platform,
        project_key_hash: project_key_hash || hashProjectKey(rawProjectKey),
        status: status ?? 'active',
    };

    const app = await appRepository.createApp(appToCreate);
    return serializeAppWithKey(app, rawProjectKey);
}

export async function updateApp(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('App payload is required');
    }

    const id = payload.id;
    if (!id) {
        throw new Error('App id is required for update');
    }

    const {
        name,
        platform,
        project_key,
        project_key_hash,
        status,
    } = payload;

    const updatePayload = {
        ...(name !== undefined && { name }),
        ...(platform !== undefined && { platform }),
        ...(project_key !== undefined && { project_key_hash: hashProjectKey(project_key) }),
        ...(project_key === undefined && project_key_hash !== undefined && { project_key_hash }),
        ...(status !== undefined && { status }),
    };

    if (Object.keys(updatePayload).length === 0) {
        throw new Error('No updatable fields provided');
    }

    return appRepository.updateApp(id, updatePayload);
}

export async function deleteApp(id) {
    if (!id) {
        throw new Error('App id is required');
    }
    return appRepository.deleteApp(id);
}

export async function getApps(filters = {}) {
    return appRepository.getApps(filters);
}

export async function getApp(filters = {}) {
    return appRepository.getApp(filters);
}

export async function getAppById(id) {
    if (!id) {
        throw new Error('App id is required');
    }
    return appRepository.getAppById(id);
}

export async function getAppByProjectKey(projectId, projectKey) {
    if (!projectId) {
        throw new Error('Project id is required');
    }

    if (!projectKey) {
        throw new Error('Project key is required');
    }

    const hashedProjectKey = hashProjectKey(projectKey);
    const candidateProjectKeyHashes = hashedProjectKey === projectKey
        ? [hashedProjectKey]
        : [hashedProjectKey, projectKey];

    return appRepository.getAppByProjectKey(projectId, candidateProjectKeyHashes);
}
