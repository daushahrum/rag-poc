// modules/projectEnvironment/projectEnvironment.route.js

import { Router } from 'express';
import * as projectEnvironmentController from './projectEnvironment.controller.js';

import * as auth from '../../middleware/authenticate.js';

const router = Router();

router.post(
    '/create',
    auth.authenticate,
    projectEnvironmentController.createProjectEnvironment
);

router.post(
    '/update',
    auth.authenticate,
    projectEnvironmentController.updateProjectEnvironment
);

router.post(
    '/delete',
    auth.authenticate,
    projectEnvironmentController.deleteProjectEnvironment
);

router.get(
    '/list',
    auth.authenticate,
    projectEnvironmentController.listProjectEnvironment
);

router.get(
    '/:id',
    auth.authenticate,
    projectEnvironmentController.getProjectEnvironment
);

router.getProjectEnvironmentList(
    '/:projectId',
    auth.authenticate,
    projectEnvironmentController.getProjectEnvironments
);

export default router;
