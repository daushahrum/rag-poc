// modules/documentChunk/documentChunk.controller.js

import * as documentChunkService from './documentChunk.service.js';

export async function createDocumentChunk(req, res) {
    try {
        const payload = {
            ...req.body,
            created_by: req.token.id,
            updated_by: req.token.id,
        };

        const documentChunk = await documentChunkService.createDocumentChunk(payload);

        return res.json(documentChunk);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function updateDocumentChunk(req, res) {
    try {
        const payload = {
            ...req.body,
            updated_by: req.token.id,
        };

        await documentChunkService.updateDocumentChunk(payload);

        return res.status(200).json({
            message: 'Document chunk updated',
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function deleteDocumentChunk(req, res) {
    try {
        await documentChunkService.deleteDocumentChunk(req.body.id);

        return res.status(200).json({
            message: 'Document chunk deleted',
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function listDocumentChunk(req, res) {
    try {
        const documentChunks = await documentChunkService.getDocumentChunks(req.query);

        return res.json(documentChunks);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function getDocumentChunk(req, res) {
    try {
        const documentChunk = await documentChunkService.getDocumentChunkById(req.params.id);

        return res.json(documentChunk);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}
