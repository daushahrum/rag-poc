// modules/rag/rag.route.js

import { Router } from 'express';
import * as ragController from './rag.controller.js';

import * as auth from '../../middleware/authenticate.js';

const router = Router();

router.get(
    '/retrieve',
    auth.authenticate,
    ragController.retrieve
);

export default router;