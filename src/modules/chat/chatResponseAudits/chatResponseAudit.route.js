// modules/chatResponseAudit/chatResponseAudit.route.js

import { Router } from 'express';
import * as chatResponseAuditController from './chatResponseAudit.controller.js';
import { verifyProjectAndSessionKey } from '../../../middleware/verifyProjectKey.js';

import * as auth from '../../../middleware/authenticate.js';

const router = Router();

const markPublic = (req, res, next) => { req.routeSource = 'public'; next(); };

router.post(
    '/create',
    auth.authenticate,
    chatResponseAuditController.createChatResponseAudit
);

router.post(
    '/public/create',
    markPublic,
    verifyProjectAndSessionKey,
    chatResponseAuditController.createChatResponseAudit
);

router.post(
    '/update',
    auth.authenticate,
    chatResponseAuditController.updateChatResponseAudit
);

router.post(
    '/delete',
    auth.authenticate,
    chatResponseAuditController.deleteChatResponseAudit
);

router.get(
    '/list',
    auth.authenticate,
    chatResponseAuditController.listChatResponseAudit
);

router.get(
    '/analytics',
    auth.authenticate,
    chatResponseAuditController.getQueryQualityAnalytics
);

router.get(
    '/:id',
    auth.authenticate,
    chatResponseAuditController.getChatResponseAudit
);

export default router;
