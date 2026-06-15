// modules/projectEnvironment/projectEnvironment.controller.js

import * as projectEnvironmentService from './projectEnvironment.service.js';

export async function createProjectEnvironment(req, res) {
    try {
        const payload = {
            ...req.body,
            created_by: req.token.id,
            updated_by: req.token.id,
        };

        const projectEnvironment = await projectEnvironmentService.createProjectEnvironment(payload);

        return res.json(projectEnvironment);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function updateProjectEnvironment(req, res) {
    try {
        const payload = {
            ...req.body,
            updated_by: req.token.id,
        };

        await projectEnvironmentService.updateProjectEnvironment(payload);

        return res.status(200).json({
            message: 'Project environment updated',
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function deleteProjectEnvironment(req, res) {
    try {
        await projectEnvironmentService.deleteProjectEnvironment(req.body.id);

        return res.status(200).json({
            message: 'Project environment deleted',
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function listProjectEnvironment(req, res) {
    try {
        const projectEnvironments = await projectEnvironmentService.getProjectEnvironments(req.query);

        return res.json(projectEnvironments);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function getProjectEnvironment(req, res) {
    try {
        const projectEnvironment = await projectEnvironmentService.getProjectEnvironmentById(req.params.id);

        return res.json(projectEnvironment);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function getProjectEnvironments(req, res) {
    try {
        const projectEnvironments = await projectEnvironmentService.getProjectEnvironmentByProjectId(req.params.project_id);

        return res.json(projectEnvironments);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}