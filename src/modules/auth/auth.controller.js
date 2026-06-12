// modules/auth/auth.controller.js

import * as authService from './auth.service.js';

export async function login(req, res) {
    console.log('BODY:', req.body);

    try {
        const result = await authService.login(
            req.body.id,
            req.body.password
        );

        return res.json(result);
    } catch (error) {
        console.error(error);

        return res.status(401).json({
            message: error.message,
        });
    }
}