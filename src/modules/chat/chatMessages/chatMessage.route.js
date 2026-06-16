// modules/chatMessage/chatMessage.route.js

import { Router } from 'express';
import * as chatMessageController from './chatMessage.controller.js';

import * as auth from '../../../middleware/authenticate.js';

const router = Router();

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
