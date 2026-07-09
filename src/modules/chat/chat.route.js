// modules/chat/chat.route.js

import { Router } from 'express';
import chatSessionRoutes from './chatSession/chatSession.route.js';
import chatMessageRoutes from './chatMessages/chatMessage.route.js';

import * as auth from '../../middleware/authenticate.js';

import * as chatController from './chat.controller.js';
import { verifyProjectAndSessionKey, verifyProjectKey } from '../../middleware/verifyProjectKey.js';

const router = Router();

const markPortal = (req, res, next) => { req.routeSource = 'portal'; next(); };
const markPublic = (req, res, next) => { req.routeSource = 'public'; next(); };

router.use('/sessions', chatSessionRoutes);
router.use('/messages', chatMessageRoutes);

router.post(
    '/portal/send',
    markPortal,
    auth.authenticate,
    chatController.sendMessage
);

router.post(
    '/send',
    markPublic,
    verifyProjectAndSessionKey,
    chatController.sendMessage
);

router.post(
    '/send-stream',
    markPublic,
    verifyProjectAndSessionKey,
    chatController.sendMessageStream
);


export default router;
