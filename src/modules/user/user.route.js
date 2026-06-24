// router.post('/', createUser);
// router.get('/', getUsers);
// router.get('/:id', getUser);
// router.put('/:id', updateUser);
// router.delete('/:id', deleteUser);

// modules/user/user.routes.js

import express from 'express';

import * as userController from './user.controller.js';
import * as auth from '../../middleware/authenticate.js'

const router = express.Router();

router.post(
    '/create',
    auth.authenticate,
    auth.authorizeAdminCreation,
    userController.createUser
);

router.post(
    '/update',
    auth.authenticate,
    userController.updateUser
);

router.post(
    '/delete',
    auth.authenticate,
    userController.deleteUser
);

router.get(
    '/list',
    auth.authenticate,
    userController.listUser
);

router.get(
    '/:id',
    auth.authenticate,
    userController.getUser
);

export default router;
