// modules/rag/rag.controller.js

import * as ragService from './rag.service.js';

export async function retrieve(req, res) {
    try {
        const { query, project_id, limit } = req.query;

        if (!query) {
            return res.status(400).json({
                message: 'query is required',
            });
        }

        if (!project_id) {
            return res.status(400).json({
                message: 'project_id is required',
            });
        }

        const chunks = await ragService.retrieve(
            query,
            project_id,
            limit ? parseInt(limit) : 5
        );

        return res.json(chunks);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}