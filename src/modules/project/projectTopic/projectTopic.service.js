import * as projectTopicRepository from './projectTopic.repository.js';
import * as projectRepository from '../project.repository.js';

function normalizeRole(role) {
    return String(role ?? '').trim().toLowerCase();
}

function isAdminToken(token) {
    return normalizeRole(token?.role) === 'admin';
}

function assertProjectAccess(projectId, token) {
    if (isAdminToken(token)) {
        return;
    }

    if (!token?.project_id || String(token.project_id) !== String(projectId)) {
        const error = new Error('You can only manage topics for your own project');
        error.status = 403;
        throw error;
    }
}

function normalizeTopicName(name) {
    return String(name ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeKeywords(keywords) {
    if (keywords === undefined || keywords === null || keywords === '') {
        return null;
    }

    if (Array.isArray(keywords)) {
        return keywords
            .map((keyword) => String(keyword).trim())
            .filter(Boolean);
    }

    return String(keywords)
        .split(',')
        .map((keyword) => keyword.trim())
        .filter(Boolean);
}

export async function createTopic(payload, token = null) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Topic payload is required');
    }

    const {
        project_id,
        name,
        description,
        keywords,
        is_active,
    } = payload;

    if (!project_id) {
        throw new Error('Topic project_id is required');
    }

    const normalizedName = normalizeTopicName(name);

    if (!normalizedName) {
        throw new Error('Topic name is required');
    }

    assertProjectAccess(project_id, token);

    const project = await projectRepository.getProjectById(project_id);

    if (!project) {
        throw new Error('Project not found');
    }

    const existing = await projectTopicRepository.getTopicByName(project_id, normalizedName);

    if (existing) {
        throw new Error('Topic with this name already exists for this project');
    }

    const topicToCreate = {
        project_id,
        name: normalizedName,
        description: description?.trim?.() || null,
        keywords: normalizeKeywords(keywords),
        is_active: is_active ?? true,
    };

    return projectTopicRepository.createTopic(topicToCreate);
}

export async function updateTopic(payload, token = null) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Topic payload is required');
    }

    const id = payload.id;
    if (!id) {
        throw new Error('Topic id is required for update');
    }

    const existingTopic = await projectTopicRepository.getTopicById(id);

    if (!existingTopic) {
        throw new Error('Topic not found');
    }

    assertProjectAccess(existingTopic.project_id, token);

    const {
        name,
        description,
        keywords,
        is_active,
    } = payload;

    const normalizedName = name !== undefined ? normalizeTopicName(name) : undefined;

    if (name !== undefined && !normalizedName) {
        throw new Error('Topic name is required');
    }

    if (normalizedName) {
        const duplicate = await projectTopicRepository.getTopicByName(
            existingTopic.project_id,
            normalizedName,
            id,
        );

        if (duplicate) {
            throw new Error('Topic with this name already exists for this project');
        }
    }

    const updatePayload = {
        ...(normalizedName !== undefined && { name: normalizedName }),
        ...(description !== undefined && { description: description?.trim?.() || null }),
        ...(keywords !== undefined && { keywords: normalizeKeywords(keywords) }),
        ...(is_active !== undefined && { is_active }),
    };

    if (Object.keys(updatePayload).length === 0) {
        throw new Error('No updatable fields provided');
    }

    return projectTopicRepository.updateTopic(id, updatePayload);
}

export async function deleteTopic(id, token = null) {
    if (!id) {
        throw new Error('Topic id is required');
    }

    const existingTopic = await projectTopicRepository.getTopicById(id);

    if (!existingTopic) {
        throw new Error('Topic not found');
    }

    assertProjectAccess(existingTopic.project_id, token);

    return projectTopicRepository.updateTopic(id, { is_active: false });
}

export async function getTopics(filters = {}, token = null) {
    if (!filters.project_id) {
        if (!isAdminToken(token) && token?.project_id) {
            filters.project_id = token.project_id;
        } else {
            throw new Error('Topic project_id is required');
        }
    }

    assertProjectAccess(filters.project_id, token);
    return projectTopicRepository.getTopics(filters);
}

export async function getTopic(filters = {}, token = null) {
    if (filters.project_id) {
        assertProjectAccess(filters.project_id, token);
    } else if (!isAdminToken(token) && token?.project_id) {
        filters.project_id = token.project_id;
    }

    return projectTopicRepository.getTopic(filters);
}

export async function getTopicById(id, token = null) {
    if (!id) {
        throw new Error('Topic id is required');
    }

    const topic = await projectTopicRepository.getTopicById(id);

    if (topic) {
        assertProjectAccess(topic.project_id, token);
    }

    return topic;
}

export async function getActiveProjectTopics(projectId) {
    if (!projectId) {
        throw new Error('Project id is required');
    }

    return projectTopicRepository.getTopics({
        project_id: projectId,
        is_active: true,
    });
}
