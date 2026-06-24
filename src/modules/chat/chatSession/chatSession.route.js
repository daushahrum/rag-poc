// modules/chatMessage/chatMessage.route.js

import { Router } from 'express';
import * as chatSessionController from './chatSession.controller.js';
import { verifyProjectKey } from '../../../middleware/verifyProjectKey.js';

import * as auth from '../../../middleware/authenticate.js';

const router = Router();

const markPortal = (req, res, next) => { req.routeSource = 'portal'; next(); };
const markPublic = (req, res, next) => { req.routeSource = 'public'; next(); };

router.post(
    '/create',
    markPublic,
    verifyProjectKey,
    chatSessionController.createChatSession
);

router.post(
    '/portal/create',
    markPortal,
    auth.authenticate,
    chatSessionController.createChatSession
);

router.post(
    '/delete',
    auth.authenticate,
    chatSessionController.deleteChatSession
);

router.get(
    '/public/list',
    markPublic,
    verifyProjectKey,
    chatSessionController.listChatSession
);

router.get(
    '/list',
    auth.authenticate,
    chatSessionController.listChatSession
);

router.get(
    '/:id',
    auth.authenticate,
    chatSessionController.getChatSession
);

export default router;
