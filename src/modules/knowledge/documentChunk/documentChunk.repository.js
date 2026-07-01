// modules/documentChunk/documentChunk.repository.js

import { where } from 'sequelize';
import { sequelize } from '../../../database/db.js';
import { models } from '../../../database/db.js';

const { DocumentChunks } = models;

export async function createDocumentChunk(payload) {
    return DocumentChunks.create(payload);
}

export async function updateDocumentChunk(id, payload) {
    const [affectedRows] = await DocumentChunks.update(
        payload,
        {
            where: { id },
        }
    );

    return affectedRows;
}

export async function deleteDocumentChunk(id) {
    return DocumentChunks.destroy({
        where: { id },
    });
}

export async function deleteDocumentChunksByDocumentId(document_id) {
    return DocumentChunks.destroy({
        where: { document_id },
    });
}

export async function getDocumentChunkById(id) {
    return DocumentChunks.findByPk(id);
}

export async function getDocumentChunkByDocumentId(id) {
    return DocumentChunks.findAll({
        where : {
            document_id : id
        }
    });
}

export async function getDocumentChunks(filters = {}) {
    const where = {};

    if (filters.document_id) {
        where.document_id = filters.document_id;
    }

    if (filters.project_id) {
        where.project_id = filters.project_id;
    }

    return DocumentChunks.findAll({
        where,
        order: [['chunk_index', 'ASC']],
    });
}

// documentChunk.repository.js
export async function similaritySearch(embedding, project_id, limit = 5) {
    const vector = `[${embedding.join(',')}]`;

    const results = await sequelize.query(
        `
        SELECT
            dc.id,
            dc.document_id,
            kd.title AS document_title,
            kd.project_id,
            dc.content,
            dc.chunk_index,
            1 - (dc.embedding <=> :embedding::vector) AS similarity
        FROM document_chunks dc
        INNER JOIN knowledge_documents kd ON kd.id = dc.document_id
        WHERE kd.project_id = :project_id
          AND dc.embedding IS NOT NULL
        ORDER BY dc.embedding <=> :embedding::vector
        LIMIT :limit
        `,
        {
            replacements: { embedding: vector, project_id, limit },
            type: sequelize.QueryTypes.SELECT,
        }
    );

    return results;
}
