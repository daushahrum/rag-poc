// modules/chatMessage/chatMessage.route.js

import { Router } from 'express';
import * as chatMessageController from './chatMessage.controller.js';
import { verifyProjectKey } from '../../../middleware/verifyProjectKey.js';

import * as auth from '../../../middleware/authenticate.js';

const router = Router();

const markPublic = (req, res, next) => { req.routeSource = 'public'; next(); };

router.post(
    '/create',
    auth.authenticate,
    chatMessageController.createChatMessage
);

router.post(
    '/delete',
    auth.authenticate,
    chatMessageController.deleteChatMessage
);

router.get(
    '/public/list',
    markPublic,
    verifyProjectKey,
    chatMessageController.listChatMessage
);

router.get(
    '/list',
    auth.authenticate,
    chatMessageController.listChatMessage
);

router.get(
    '/:id',
    auth.authenticate,
    chatMessageController.getChatMessage
);

export default router;
