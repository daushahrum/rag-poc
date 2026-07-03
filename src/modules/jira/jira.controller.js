// modules/jira/jira.controller.js

import crypto from 'crypto';
import * as jiraService from './jira.service.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function getConnectedAppsRedirect(status) {
    return `${FRONTEND_URL}/?view=connected-apps&jira=${status}`;
}

// In-memory state store for CSRF protection during OAuth handshake.
// Swap for Redis/DB-backed storage if running multiple server instances.
const pendingStates = new Map();

export async function initiateConnect(req, res) {
    try {
        const projectId = req.query.project_id;

        if (!projectId) {
            return res.status(400).json({ message: 'project_id is required' });
        }

        const state = crypto.randomUUID();
        pendingStates.set(state, { projectId, userId: req.token.id, createdAt: Date.now() });

        const authorizationUrl = jiraService.getAuthorizationUrl(state);

        if (req.query.format === 'json') {
            return res.json({ authorizationUrl });
        }

        return res.redirect(authorizationUrl);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function handleCallback(req, res) {
    try {
        const { code, state, error: oauthError } = req.query;

        if (oauthError) {
            return res.redirect(getConnectedAppsRedirect('denied'));
        }

        const pending = pendingStates.get(state);

        if (!pending) {
            return res.redirect(getConnectedAppsRedirect('invalid_state'));
        }

        pendingStates.delete(state);

        await jiraService.connectProject({
            projectId: pending.projectId,
            code,
            userId: pending.userId,
        });

        return res.redirect(getConnectedAppsRedirect('connected'));
    } catch (error) {
        console.error('[jira.callback] connectProject failed:', error);
        return res.redirect(getConnectedAppsRedirect('error'));
    }
}

export async function getConnection(req, res) {
    try {
        const connection = await jiraService.getConnectionByProjectId(req.params.project_id);

        return res.json(connection);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function listProjects(req, res) {
    try {
        const projects = await jiraService.listJiraProjects(req.params.project_id);

        return res.json(projects);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function selectProject(req, res) {
    try {
        const payload = {
            projectId: req.params.project_id,
            jiraProjectKey: req.body.jiraProjectKey,
            jiraProjectName: req.body.jiraProjectName,
            userId: req.token.id,
        };

        const connection = await jiraService.setJiraProject(payload);

        return res.json(connection);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function createIssue(req, res) {
    try {
        const payload = {
            projectId: req.params.project_id,
            summary: req.body.summary,
            description: req.body.description,
            issueType: req.body.issueType,
        };

        const issue = await jiraService.createIssue(payload);

        return res.json(issue);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function disconnect(req, res) {
    try {
        await jiraService.disconnectProject(req.params.project_id);

        return res.status(200).json({
            message: 'Jira disconnected',
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}
