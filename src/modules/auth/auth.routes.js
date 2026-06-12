// modules/auth/auth.routes.js

import express from 'express';

import * as auth from '../../middleware/authenticate.js';
import * as authController from './auth.controller.js';

const router = express.Router();

router.post(
    '/login',
    authController.login
);

router.post(
    '/change-password',
    auth.authenticate,
    async (req, res) =>{
        authController.changePassword(req, res)
    }
);

export default router;