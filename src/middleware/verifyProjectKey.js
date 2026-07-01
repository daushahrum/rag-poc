// middleware/verifyProjectKey.js

import * as projectRepository from '../modules/project/project.repository.js';
import * as appService from '../modules/apps/app.service.js';
import * as chatSessionRepository from '../modules/chat/chatSession/chatSession.repository.js';

async function verifyActiveProjectApp(projectId, projectKey) {
    const app = await appService.getAppByProjectKey(projectId, projectKey);

    if (!app) {
        return null;
    }

    return app.status === 'active' ? app : false;
}

/**
 * Verify both project key and session key.
 * Requires x-project-key header and session_id in body.
 */
export async function verifyProjectAndSessionKey(req, res, next) {
    try {
        const projectKey = req.headers['x-project-key'];
        const session_id = req.body?.session_id ?? req.body?.chat_session_id;

        if (!projectKey) {
            return res.status(401).json({ message: 'Project key is required' });
        }

        if (!session_id) {
            return res.status(400).json({ message: 'session_id is required' });
        }

        const session = await chatSessionRepository.getChatSessionById(session_id);

        if (!session) {
            return res.status(404).json({ message: 'Chat session not found' });
        }

        const project = await projectRepository.getProjectById(session.project_id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const app = await verifyActiveProjectApp(project.id, projectKey);

        if (app === null) {
            return res.status(401).json({ message: 'Invalid project key' });
        }

        if (app === false) {
            return res.status(403).json({ message: 'App is not active' });
        }

        if (!project.is_active) {
            return res.status(403).json({ message: 'Project is not active' });
        }

        req.project = project;
        req.projectApp = app;
        req.chatSession = session;
        next();
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

/**
 * Verify project key only.
 * Requires x-project-key header and project_code in body.
 */
export async function verifyProjectKey(req, res, next) {
    try {
        const projectKey = req.headers['x-project-key'];
        const project_code = req.body?.project_code ?? req.query?.project_code;

        if (!projectKey) {
            return res.status(401).json({ message: 'Project key is required' });
        }

        if (!project_code) {
            return res.status(400).json({ message: 'project_code is required' });
        }

        const project = await projectRepository.getProjectByCode(project_code);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const app = await verifyActiveProjectApp(project.id, projectKey);

        if (app === null) {
            return res.status(401).json({ message: 'Invalid project key' });
        }

        if (app === false) {
            return res.status(403).json({ message: 'App is not active' });
        }

        if (!project.is_active) {
            return res.status(403).json({ message: 'Project is not active' });
        }

        req.project = project;
        req.projectApp = app;
        next();
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}
