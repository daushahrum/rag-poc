// modules/knowledgeDocument/knowledgeDocument.service.js

import * as knowledgeDocumentRepository from './knowledgeDocument.repository.js';

export async function createKnowledgeDocument(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Knowledge document payload is required');
    }

    const { title, project_id } = payload;

    if (!title) {
        throw new Error('Knowledge document title is required');
    }

    if (!project_id) {
        throw new Error('Knowledge document project_id is required');
    }

    const knowledgeDocumentToCreate = {
        ...payload,
    };

    return knowledgeDocumentRepository.createKnowledgeDocument(knowledgeDocumentToCreate);
}

export async function deleteKnowledgeDocument(id) {
    if (!id) {
        throw new Error('Knowledge document id is required');
    }
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

    const { title, updated_by } = payload;

    const updatePayload = {
        ...(title !== undefined && { title }),
        ...(updated_by !== undefined && { updated_by }),
    };

    if (Object.keys(updatePayload).length === 0) {
        throw new Error('No updatable fields provided');
    }

    return knowledgeDocumentRepository.updateKnowledgeDocument(id, updatePayload);
}

export async function getKnowledgeDocuments(filters = {}) {
    return knowledgeDocumentRepository.getKnowledgeDocuments(filters);
}

export async function getKnowledgeDocumentById(id) {
    if (!id) {
        throw new Error('Knowledge document id is required');
    }
    return knowledgeDocumentRepository.getKnowledgeDocumentById(id);
}
