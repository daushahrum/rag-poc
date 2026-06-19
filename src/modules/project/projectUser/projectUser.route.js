// modules/projectUser/projectUser.routes.js

import express from 'express';

import * as projectUserController from './projectUser.controller.js';
import * as auth from '../../../middleware/authenticate.js';

const router = express.Router();

router.post(
    '/create',
    auth.authenticate,
    projectUserController.createProjectUser
);

router.post(
    '/update',
    auth.authenticate,
    projectUserController.updateProjectUser
);

router.post(
    '/delete',
    auth.authenticate,
    projectUserController.deleteProjectUser
);

router.get(
    '/list',
    auth.authenticate,
    projectUserController.listProjectUsers
);

router.get(
    '/find',
    auth.authenticate,
    projectUserController.findProjectUser
);

router.get(
    '/:id',
    auth.authenticate,
    projectUserController.getProjectUser
);

export default router;
