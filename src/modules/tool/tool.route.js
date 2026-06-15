// modules/tool/tool.route.js

import { Router } from 'express';
import * as toolController from './tool.controller.js';

import * as auth from '../../middleware/authenticate.js';

const router = Router();

router.post(
    '/create',
    auth.authenticate,
    toolController.createTool
);

router.post(
    '/update',
    auth.authenticate,
    toolController.updateTool
);

router.post(
    '/delete',
    auth.authenticate,
    toolController.deleteTool
);

router.get(
    '/list',
    auth.authenticate,
    toolController.listTool
);

router.get(
    '/:id',
    auth.authenticate,
    toolController.getTool
);

export default router;