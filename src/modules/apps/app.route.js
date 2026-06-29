import { Router } from 'express';
import * as appController from './app.controller.js';
import * as auth from '../../middleware/authenticate.js';

const router = Router();

router.post(
    '/create',
    auth.authenticate,
    appController.createApp
);

router.post(
    '/update',
    auth.authenticate,
    appController.updateApp
);

router.post(
    '/delete',
    auth.authenticate,
    appController.deleteApp
);

router.get(
    '/list',
    auth.authenticate,
    appController.listApps
);

router.get(
    '/find',
    auth.authenticate,
    appController.findApp
);

router.get(
    '/:id',
    auth.authenticate,
    appController.getApp
);

export default router;
