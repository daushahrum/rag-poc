// modules/jira/jira.route.js

import { Router } from 'express';
import * as jiraController from './jira.controller.js';

import * as auth from '../../middleware/authenticate.js';

const router = Router();

// OAuth handshake
router.get(
    '/connect',
    auth.authenticate,
    jiraController.initiateConnect
);

// Atlassian redirects here - no auth middleware, the `state` param is the guard
router.get(
    '/callback',
    jiraController.handleCallback
);

// Connection + project selection
router.get(
    '/:project_id/connection',
    auth.authenticate,
    jiraController.getConnection
);

router.get(
    '/:project_id/projects',
    auth.authenticate,
    jiraController.listProjects
);

router.post(
    '/:project_id/select-project',
    auth.authenticate,
    jiraController.selectProject
);

router.delete(
    '/:project_id/disconnect',
    auth.authenticate,
    jiraController.disconnect
);

// Issue creation
router.post(
    '/:project_id/issues',
    auth.authenticate,
    jiraController.createIssue
);

export default router;
