// modules/project/project.controller.js

import * as projectService from './project.service.js';

export async function createProject(req, res) {
    try {
        const payload = {
            ...req.body,
            created_by: req.token.id,
            updated_by: req.token.id,
        };

        const project = await projectService.createProject(
            payload
        );

        return res.json(project);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function updateProject(req, res) {
    try {
        const payload = {
            ...req.body,
            updated_by: req.token.id,
        };

        await projectService.updateProject(
            payload
        );

        return res.status(200).json({
            message: 'Project updated',
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function deleteProject(req, res) {
    try {
        await projectService.deleteProject(
            req.body.id
        );

        return res.status(200).json({
            message: 'Project deleted',
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function listProject(req, res) {
    try {
        const projects = await projectService.getProjects();

        return res.json(projects);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function getProject(req, res) {
    try {
        const project = await projectService.getProjectById(
            req.params.id
        );

        return res.json(project);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}