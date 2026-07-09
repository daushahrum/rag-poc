/**
 * Knowledge API — handles calls to /api/knowledge_document/*
 */

import { getAuthHeaders } from '../../core/auth/session.js';
import { apiRequest } from './http.js';

export async function ingestKnowledge(title, content, projectId) {
    return apiRequest('/api/knowledge_document/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ title, content, project_id: projectId }),
    }, 'Could not ingest knowledge.');
}

export async function fetchKnowledgeDocuments(projectId) {
    const data = await apiRequest(`/api/knowledge_document/project/${encodeURIComponent(projectId)}`, {
        headers: getAuthHeaders(),
    }, 'Could not load knowledge documents.');
    return (Array.isArray(data) ? data : (data.documents ?? [])).map((document) => {
        const chunks = [...(document.chunks ?? [])].sort(
            (left, right) => left.chunk_index - right.chunk_index
        );
        const content = chunks.map((chunk) => chunk.content).join(' ');

        return {
            ...document,
            content,
            chunk_count: chunks.length,
            preview: content.slice(0, 140),
        };
    });
}

export async function fetchKnowledgeDocument(documentId) {
    const data = await apiRequest(`/api/knowledge_document/${encodeURIComponent(documentId)}`, {
        headers: getAuthHeaders(),
    }, 'Could not load knowledge document.');
    return data.document ?? data;
}

export async function updateKnowledgeDocument(documentId, payload) {
    return apiRequest('/api/knowledge_document/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ id: documentId, ...payload }),
    }, 'Could not update knowledge document.');
}

export async function deleteKnowledgeDocument(documentId) {
    return apiRequest('/api/knowledge_document/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ id: documentId }),
    }, 'Could not delete knowledge document.');
}

export async function ingestDocumentFile(file, options = {}) {
    const { projectId, title } = options;
    const formData = new FormData();
    formData.append('document', file);
    if (projectId) formData.append('project_id', projectId);
    if (title) formData.append('title', title);

    return apiRequest('/api/knowledge_document/create', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
    }, 'Could not ingest document.');
}
