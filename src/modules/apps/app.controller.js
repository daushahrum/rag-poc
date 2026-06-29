import * as appService from './app.service.js';

export async function createApp(req, res) {
    try {
        const app = await appService.createApp(req.body);

        return res.json(app);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function updateApp(req, res) {
    try {
        await appService.updateApp(req.body);

        return res.status(200).json({
            message: 'App updated',
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function deleteApp(req, res) {
    try {
        await appService.deleteApp(req.body.id);

        return res.status(200).json({
            message: 'App deleted',
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function listApps(req, res) {
    try {
        const apps = await appService.getApps(req.query);

        return res.json(apps);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function findApp(req, res) {
    try {
        const app = await appService.getApp(req.query);

        return res.json(app);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function getApp(req, res) {
    try {
        const app = await appService.getAppById(req.params.id);

        return res.json(app);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}
