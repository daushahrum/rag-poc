// modules/project/project.route.js

import { Router } from 'express';
import * as projectController from './project.controller.js';
import projectEnvironmentRoutes from './projectEnvironment/projectEnvironment.route.js';
import projectUserRoutes from './projectUser/projectUser.route.js';
import projectTopicRoutes from './projectTopic/projectTopic.route.js';
import * as projectEnvironmentController from './projectEnvironment/projectEnvironment.controller.js';
import * as toolController from '../tool/tool.controller.js';

import * as auth from '../../middleware/authenticate.js'

const router = Router();

router.use('/environments', projectEnvironmentRoutes);
router.use('/users', projectUserRoutes);
router.use('/topics', projectTopicRoutes);

router.post(
    '/create',
    auth.authenticate,
    projectController.createProject
);

router.post(
    '/create_environment',
    auth.authenticate,
    projectEnvironmentController.createProjectEnvironment
);

router.post(
    '/update',
    auth.authenticate,
    projectController.updateProject
);

router.post(
    '/delete',
    auth.authenticate,
    projectController.deleteProject
);

router.get(
    '/list',
    auth.authenticate,
    projectController.listProject
);

router.get(
    '/environment_list/:project_id',
    auth.authenticate,
    projectEnvironmentController.getProjectEnvironments
);


router.get(
    '/tools/:project_id',
    auth.authenticate,
    toolController.getProjectTool
);

router.get(
    '/:id',
    auth.authenticate,
    projectController.getProject
);

export default router;
