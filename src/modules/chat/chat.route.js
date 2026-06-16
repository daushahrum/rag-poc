// modules/chat/chat.route.js

import { Router } from 'express';
import chatSessionRoutes from './chatSession/chatSession.route.js';
import chatMessageRoutes from './chatMessages/chatMessage.route.js';

import * as auth from '../../middleware/authenticate.js';

import * as chatController from './chat.controller.js';

const router = Router();

router.use('/sessions', chatSessionRoutes);
router.use('/messages', chatMessageRoutes);

router.post(
    '/send',
    auth.authenticate,
    chatController.sendMessage
);


export default router;
