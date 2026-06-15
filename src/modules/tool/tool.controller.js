// modules/tool/tool.controller.js

import * as toolService from './tool.service.js';

export async function createTool(req, res) {
    try {
        const payload = {
            ...req.body,
            created_by: req.token.id,
            updated_by: req.token.id,
        };

        const tool = await toolService.createTool(payload);

        return res.json(tool);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function updateTool(req, res) {
    try {
        const payload = {
            ...req.body,
            updated_by: req.token.id,
        };

        await toolService.updateTool(payload);

        return res.status(200).json({
            message: 'Tool updated',
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function deleteTool(req, res) {
    try {
        await toolService.deleteTool(req.body.id);

        return res.status(200).json({
            message: 'Tool deleted',
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function listTool(req, res) {
    try {
        const tools = await toolService.getTools(req.query);

        return res.json(tools);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function getTool(req, res) {
    try {
        const tool = await toolService.getToolById(req.params.id);

        return res.json(tool);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}