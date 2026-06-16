// modules/rag/rag.service.js

import { embedText } from '../../../lib/embedder.js';
import * as documentChunkRepository from '../documentChunk/documentChunk.repository.js';

export async function retrieve(query, project_id, limit = 5) {
    if (!query) {
        throw new Error('Query is required');
    }

    if (!project_id) {
        throw new Error('Project id is required');
    }

    const embedding = await embedText(query);

    const chunks = await documentChunkRepository.similaritySearch(
        embedding,
        project_id,
        limit
    );

    return chunks;
}

export async function buildContext(query, project_id, limit = 5) {
    const chunks = await retrieve(query, project_id, limit);

    const context = chunks
        .map((c) => c.content)
        .join('\n\n---\n\n');

    return { context, chunks };
}