// modules/knowledgeDocument/knowledgeDocument.controller.js

import * as knowledgeDocumentService from './knowledgeDocument.service.js';

export async function createKnowledgeDocument(req, res) {
    try {
        const payload = {
            ...req.body,
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
