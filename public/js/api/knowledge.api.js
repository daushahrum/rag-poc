/**
 * Knowledge API — handles calls to /api/knowledge_document/*
 */

import { getAuthHeaders } from '../auth.js';

export async function ingestKnowledge(title, content) {
    const response = await fetch('/api/knowledge_document/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ title, content }),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not ingest knowledge.');
    }

    return response.json();
}

export async function fetchKnowledgeDocuments() {
    const response = await fetch('/api/knowledge_document/list', {
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not load knowledge documents.');
    }

    const data = await response.json();
    return data.documents ?? [];
}

export async function fetchKnowledgeDocument(documentId) {
    const response = await fetch(`/api/knowledge_document/${encodeURIComponent(documentId)}`, {
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not load knowledge document.');
    }

    const data = await response.json();
    return data.document;
}

export async function updateKnowledgeDocument(documentId, payload) {
    const response = await fetch('/api/knowledge_document/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ id: documentId, ...payload }),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not update knowledge document.');
    }

    return response.json();
}

export async function deleteKnowledgeDocument(documentId) {
    const response = await fetch('/api/knowledge_document/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ id: documentId }),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not delete knowledge document.');
    }

    return response.json();
}

export async function ingestDocumentFile(file) {
    const formData = new FormData();
    formData.append('document', file);

    const response = await fetch('/api/knowledge_document/create', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not ingest document.');
    }

    return response.json();
}
