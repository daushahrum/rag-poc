// modules/knowledgeDocument/knowledgeDocument.service.js

import * as knowledgeDocumentRepository from './knowledgeDocument.repository.js';
import * as documentChunkService from '../documentChunk/documentChunk.service.js';

export async function createKnowledgeDocument(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Knowledge document payload is required');
    }

    const { title, project_id, content } = payload;

    if (!title) {
        throw new Error('Knowledge document title is required');
    }

    if (!project_id) {
        throw new Error('Knowledge document project_id is required');
    }

    if (!content) {
        throw new Error('Knowledge document content is required');
    }
    const { content: _, ...knowledgeDocumentToCreate } = payload;

    const document = await knowledgeDocumentRepository.createKnowledgeDocument(knowledgeDocumentToCreate);

    await documentChunkService.chunkDocument(document.id, content, project_id);

    return document;
}

export async function deleteKnowledgeDocument(id) {
    if (!id) {
        throw new Error('Knowledge document id is required');
    }
    await documentChunkService.deleteDocumentChunksByDocumentId(id);
    return knowledgeDocumentRepository.deleteKnowledgeDocument(id);
}

export async function updateKnowledgeDocument(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Knowledge document payload is required');
    }

    const id = payload.id;
    if (!id) {
        throw new Error('Knowledge document id is required for update');
    }

    const { title, content, updated_by } = payload;

    const updatePayload = {
        ...(title !== undefined && { title }),
        ...(updated_by !== undefined && { updated_by }),
    };

    if (Object.keys(updatePayload).length === 0) {
        throw new Error('No updatable fields provided');
    }

    const result = await knowledgeDocumentRepository.updateKnowledgeDocument(id, updatePayload);

    if (content !== undefined) {
        const document = await knowledgeDocumentRepository.getKnowledgeDocumentById(id);
        await documentChunkService.deleteDocumentChunksByDocumentId(id);
        await documentChunkService.chunkDocument(id, content, document.project_id);
    }

    return result;
}

export async function getKnowledgeDocuments(filters = {}) {
    return knowledgeDocumentRepository.getKnowledgeDocuments(filters);
}

export async function getKnowledgeDocumentByProjectId(project_id) {
    if (!project_id) {
        throw new Error('Project id is required');
    }
    return knowledgeDocumentRepository.getKnowledgeDocumentByProjectId(project_id);
}


export async function getKnowledgeDocumentById(id) {
    if (!id) {
        throw new Error('Knowledge document id is required');
    }
    return knowledgeDocumentRepository.getKnowledgeDocumentById(id);
}
