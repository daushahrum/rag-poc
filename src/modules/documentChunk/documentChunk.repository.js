// modules/documentChunk/documentChunk.repository.js

import { models } from '../../database/db.js';

const { DocumentChunk } = models;

export async function createDocumentChunk(payload) {
    return DocumentChunk.create(payload);
}

export async function updateDocumentChunk(id, payload) {
    const [affectedRows] = await DocumentChunk.update(
        payload,
        {
            where: { id },
        }
    );

    return affectedRows;
}

export async function deleteDocumentChunk(id) {
    return DocumentChunk.destroy({
        where: { id },
    });
}

export async function getDocumentChunkById(id) {
    return DocumentChunk.findByPk(id);
}

export async function getDocumentChunks(filters = {}) {
    const where = {};

    if (filters.document_id) {
        where.document_id = filters.document_id;
    }

    if (filters.project_id) {
        where.project_id = filters.project_id;
    }

    return DocumentChunk.findAll({
        where,
        order: [['chunk_index', 'ASC']],
    });
}
