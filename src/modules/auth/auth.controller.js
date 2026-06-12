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
export async function changePassword(req, res) {
    console.log('BODY:', req.body);
    console.log('TOKEN:', req.token);
    const token = req.token

    try {
        const result = await authService.changePassword( { req },
            req.body.id,
            req.body.old_password,
            req.body.new_password,
        );

        return res.json({ status: 'Success', message: result.message });
    } catch (error) {
        console.error(error);

        return res.status(401).json({
            status: 'Failed',
            message: error.message,
        });
    }
}