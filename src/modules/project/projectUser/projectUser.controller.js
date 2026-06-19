// modules/projectUser/projectUser.controller.js

import * as projectUserService from './projectUser.service.js';

export async function createProjectUser(req, res) {
    try {
        const projectUser =
            await projectUserService.createProjectUser(
                req.body
            );

        return res.json(projectUser);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function updateProjectUser(req, res) {
    try {
        await projectUserService.updateProjectUser(
            req.body.id,
            req.body
        );

        return res.status(200).json({
            message: 'Project user updated',
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function deleteProjectUser(req, res) {
    try {
        await projectUserService.deleteProjectUser(
            req.body.id
        );

        return res.status(200).json({
            message: 'Project user deleted',
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function listProjectUsers(req, res) {
    try {
        const projectUsers =
            await projectUserService.getProjectUsers();

        return res.json(projectUsers);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function findProjectUser(req, res) {
    try {
        const projectUsers =
            await projectUserService.getProjectUser(req.query);

        return res.json(projectUsers);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function getProjectUser(req, res) {
    try {
        const projectUser =
            await projectUserService.getProjectUser(
                { id: req.params.id }
            );

        return res.json(projectUser);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}
