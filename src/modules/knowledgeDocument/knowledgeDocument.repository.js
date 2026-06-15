// modules/knowledgeDocument/knowledgeDocument.repository.js

import { models } from '../../database/db.js';

const { KnowledgeDocument } = models;

export async function createKnowledgeDocument(payload) {
    return KnowledgeDocument.create(payload);
}

export async function updateKnowledgeDocument(id, payload) {
    const [affectedRows] = await KnowledgeDocument.update(
        payload,
        {
            where: { id },
        }
    );

    return affectedRows;
}

export async function deleteKnowledgeDocument(id) {
    return KnowledgeDocument.destroy({
        where: { id },
    });
}

export async function getKnowledgeDocumentById(id) {
    return KnowledgeDocument.findByPk(id);
}

export async function getKnowledgeDocuments(filters = {}) {
    const where = {};

    if (filters.project_id) {
        where.project_id = filters.project_id;
    }

    return KnowledgeDocument.findAll({ where });
}
