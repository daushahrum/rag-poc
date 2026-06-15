// modules/tool/tool.service.js

import * as toolRepository from './tool.repository.js';

export async function createTool(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Tool payload is required');
    }

    const {
        project_id,
        tool_name,
        description,
        endpoint,
        method,
        path_params,
        query_params,
        body_schema,
        example_payload,
        response_schema,
        version,
        is_enabled,
    } = payload;

    if (!project_id) {
        throw new Error('Tool project_id is required');
    }

    if (!tool_name) {
        throw new Error('Tool tool_name is required');
    }

    if (!endpoint) {
        throw new Error('Tool endpoint is required');
    }

    const toolToCreate = {
        ...payload,
        is_enabled: payload.is_enabled ?? true,
        method: payload.method ?? 'GET',
        version: payload.version ?? '1.0.0',
    };

    return toolRepository.createTool(toolToCreate);
}

export async function deleteTool(id) {
    if (!id) {
        throw new Error('Tool id is required');
    }
    return toolRepository.deleteTool(id);
}

export async function updateTool(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Tool payload is required');
    }

    const id = payload.id;
    if (!id) {
        throw new Error('Tool id is required for update');
    }

    const {
        tool_name,
        description,
        endpoint,
        method,
        path_params,
        query_params,
        body_schema,
        example_payload,
        response_schema,
        version,
        is_enabled,
        updated_by,
    } = payload;

    const updatePayload = {
        ...(tool_name !== undefined && { tool_name }),
        ...(description !== undefined && { description }),
        ...(endpoint !== undefined && { endpoint }),
        ...(method !== undefined && { method }),
        ...(path_params !== undefined && { path_params }),
        ...(query_params !== undefined && { query_params }),
        ...(body_schema !== undefined && { body_schema }),
        ...(example_payload !== undefined && { example_payload }),
        ...(response_schema !== undefined && { response_schema }),
        ...(version !== undefined && { version }),
        ...(is_enabled !== undefined && { is_enabled }),
        ...(updated_by !== undefined && { updated_by }),
    };

    if (Object.keys(updatePayload).length === 0) {
        throw new Error('No updatable fields provided');
    }

    return toolRepository.updateTool(id, updatePayload);
}

export async function getTools(filters = {}) {
    return toolRepository.getTools(filters);
}

export async function getToolById(id) {
    if (!id) {
        throw new Error('Tool id is required');
    }
    return toolRepository.getToolById(id);
}

export async function getProjectTools(project_id) {
    if (!project_id) {
        throw new Error('Project ID is required');
    }
    return toolRepository.getProjectTools(project_id);
}