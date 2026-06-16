// modules/knowledgeDocument/knowledgeDocument.repository.js

import { models } from '../../database/db.js';

const { KnowledgeDocuments } = models;

export async function createKnowledgeDocument(payload) {
    return KnowledgeDocuments.create(payload);
}

export async function updateKnowledgeDocument(id, payload) {
    const [affectedRows] = await KnowledgeDocuments.update(
        payload,
        {
            where: { id },
        }
    );

    return affectedRows;
}

export async function deletes(id) {
    return KnowledgeDocuments.destroy({
        where: { id },
    });
}

export async function getKnowledgeDocumentById(id) {
    return KnowledgeDocuments.findByPk(id);
}

export async function getKnowledgeDocumentByProjectId(project_id) {
    return KnowledgeDocuments.findAll({
        where : {
            project_id : project_id
        }
    });
}

export async function getKnowledgeDocuments(filters = {}) {
    const where = {};

    if (filters.project_id) {
        where.project_id = filters.project_id;
    }

    return KnowledgeDocuments.findAll({ where });
}
