import { Router } from 'express';
import * as projectTopicController from './projectTopic.controller.js';
import * as auth from '../../../middleware/authenticate.js';

const router = Router();

router.post(
    '/create',
    auth.authenticate,
    projectTopicController.createTopic
);

router.post(
    '/update',
    auth.authenticate,
    projectTopicController.updateTopic
);

router.post(
    '/delete',
    auth.authenticate,
    projectTopicController.deleteTopic
);

router.get(
    '/list',
    auth.authenticate,
    projectTopicController.listTopics
);

router.get(
    '/find',
    auth.authenticate,
    projectTopicController.findTopic
);

router.get(
    '/:id',
    auth.authenticate,
    projectTopicController.getTopic
);

export default router;
