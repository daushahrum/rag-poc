// modules/knowledgeDocument/knowledgeDocument.controller.js

import { PDFParse } from 'pdf-parse';

import * as knowledgeDocumentService from './knowledgeDocument.service.js';
import * as documentChunkService from '../documentChunk/documentChunk.service.js';

function getDocumentTitleFromFilename(filename) {
    const title = filename
        .replace(/\.[^.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .trim();

    return title || 'Knowledge document';
}

async function extractUploadedDocumentContent(file) {
    const isPdf = file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname);
    const isText = file.mimetype === 'text/plain' || /\.txt$/i.test(file.originalname);
    const isMarkdown = ['text/markdown', 'text/x-markdown'].includes(file.mimetype)
        || /\.md$/i.test(file.originalname);

    if (isText || isMarkdown) {
        return file.buffer.toString('utf8').trim();
    }

    if (isPdf) {
        const parser = new PDFParse({ data: file.buffer });
        try {
            const result = await parser.getText();
            return (result.text ?? '').trim();
        } finally {
            await parser.destroy();
        }
    }

    throw new Error('Only PDF, TXT, or Markdown documents are supported');
}

export async function createKnowledgeDocument(req, res) {
    try {
        const uploadedContent = req.file
            ? await extractUploadedDocumentContent(req.file)
            : null;
        const payload = {
            ...req.body,
            ...(req.file && {
                title: req.body.title || getDocumentTitleFromFilename(req.file.originalname),
                content: uploadedContent,
            }),
            created_by: req.token.id,
            updated_by: req.token.id,
        };

        const knowledgeDocument = await knowledgeDocumentService.createKnowledgeDocument(payload);

        return res.json(knowledgeDocument);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function updateKnowledgeDocument(req, res) {
    try {
        const payload = {
            ...req.body,
            updated_by: req.token.id,
        };

        await knowledgeDocumentService.updateKnowledgeDocument(payload);

        return res.status(200).json({
            message: 'Knowledge document updated',
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function deleteKnowledgeDocument(req, res) {
    try {
        await knowledgeDocumentService.deleteKnowledgeDocument(req.body.id);

        return res.status(200).json({
            message: 'Knowledge document deleted',
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function listKnowledgeDocument(req, res) {
    try {
        const knowledgeDocuments = await knowledgeDocumentService.getKnowledgeDocuments(req.query);

        return res.json(knowledgeDocuments);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function getKnowledgeDocumentByProjectId(req, res) {
    try {
        const documents =
            await knowledgeDocumentService.getKnowledgeDocumentByProjectId(
                req.params.project_id
            );

        const result = await Promise.all(
            documents.map(async (document) => {
                const chunks =
                    await documentChunkService.getDocumentChunkByDocumentId(
                        document.id
                    );

                return {
                    ...document.toJSON(),
                    chunks: chunks.map((chunk) => ({
                        id: chunk.id,
                        content: chunk.content,
                        chunk_index: chunk.chunk_index,
                    })),
                };
            })
        );

        return res.json(result);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function getKnowledgeDocument(req, res) {
    try {
        const knowledgeDocument = await knowledgeDocumentService.getKnowledgeDocumentById(req.params.id);

        return res.json(knowledgeDocument);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}
