// modules/documentChunk/documentChunk.service.js

import * as documentChunkRepository from './documentChunk.repository.js';

export async function createDocumentChunk(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Document chunk payload is required');
    }

    const { document_id, content, chunk_index, project_id } = payload;

    if (!document_id) {
        throw new Error('Document chunk document_id is required');
    }

    if (!content) {
        throw new Error('Document chunk content is required');
    }

    if (chunk_index === undefined || chunk_index === null) {
        throw new Error('Document chunk chunk_index is required');
    }

    if (!project_id) {
        throw new Error('Document chunk project_id is required');
    }

    const documentChunkToCreate = {
        ...payload,
    };

    return documentChunkRepository.createDocumentChunk(documentChunkToCreate);
}

export async function deleteDocumentChunk(id) {
    if (!id) {
        throw new Error('Document chunk id is required');
    }
    return documentChunkRepository.deleteDocumentChunk(id);
}

export async function updateDocumentChunk(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Document chunk payload is required');
    }

    const id = payload.id;
    if (!id) {
        throw new Error('Document chunk id is required for update');
    }

    const { content, embedding, chunk_index, updated_by } = payload;

    const updatePayload = {
        ...(content !== undefined && { content }),
        ...(embedding !== undefined && { embedding }),
        ...(chunk_index !== undefined && { chunk_index }),
        ...(updated_by !== undefined && { updated_by }),
    };

    if (Object.keys(updatePayload).length === 0) {
        throw new Error('No updatable fields provided');
    }

    return documentChunkRepository.updateDocumentChunk(id, updatePayload);
}

export async function getDocumentChunks(filters = {}) {
    return documentChunkRepository.getDocumentChunks(filters);
}

export async function getDocumentChunkById(id) {
    if (!id) {
        throw new Error('Document chunk id is required');
    }
    return documentChunkRepository.getDocumentChunkById(id);
}
