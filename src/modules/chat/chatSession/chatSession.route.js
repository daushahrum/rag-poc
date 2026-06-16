// modules/chatMessage/chatMessage.route.js

import { Router } from 'express';
import * as chatSessionController from './chatSession.controller.js';

import * as auth from '../../../middleware/authenticate.js';

const router = Router();

router.post(
    '/create',
    auth.authenticate,
    chatSessionController.createChatSession
);

router.post(
    '/delete',
    auth.authenticate,
    chatSessionController.deleteChatSession
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
