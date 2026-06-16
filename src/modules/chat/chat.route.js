// modules/chat/chat.route.js

import { Router } from 'express';
import chatSessionRoutes from './chatSession/chatSession.route.js';
import chatMessageRoutes from './chatMessages/chatMessage.route.js';

import * as auth from '../../middleware/authenticate.js';

import * as chatController from './chat.controller.js';
import { verifyProjectKey } from '../../middleware/verifyProjectKey.js';

const router = Router();

router.use('/sessions', chatSessionRoutes);
router.use('/messages', chatMessageRoutes);

router.post(
    '/portal/send',
    auth.authenticate,
    chatController.sendMessage
);

router.post(
    '/send',
    verifyProjectKey,
    chatController.sendMessage
);


export default router;
