// modules/knowledgeDocument/knowledgeDocument.route.js

import { Router } from 'express';
import * as knowledgeDocumentController from './knowledgeDocument.controller.js';

import * as auth from '../../middleware/authenticate.js';

const router = Router();

router.post(
    '/create',
    auth.authenticate,
    knowledgeDocumentController.createKnowledgeDocument
);

router.post(
    '/update',
    auth.authenticate,
    knowledgeDocumentController.updateKnowledgeDocument
);

router.post(
    '/delete',
    auth.authenticate,
    knowledgeDocumentController.deleteKnowledgeDocument
);

router.get(
    '/list',
    auth.authenticate,
    knowledgeDocumentController.listKnowledgeDocument
);

router.get(
    '/:id',
    auth.authenticate,
    knowledgeDocumentController.getKnowledgeDocument
);

export default router;
