// modules/documentChunk/documentChunk.route.js

import { Router } from 'express';
import * as documentChunkController from './documentChunk.controller.js';

import * as auth from '../../../middleware/authenticate.js';

const router = Router();

router.post(
    '/create',
    auth.authenticate,
    documentChunkController.createDocumentChunk
);

router.post(
    '/update',
    auth.authenticate,
    documentChunkController.updateDocumentChunk
);

router.post(
    '/delete',
    auth.authenticate,
    documentChunkController.deleteDocumentChunk
);

router.get(
    '/list',
    auth.authenticate,
    documentChunkController.listDocumentChunk
);

router.get(
    '/:id',
    auth.authenticate,
    documentChunkController.getDocumentChunk
);

export default router;
