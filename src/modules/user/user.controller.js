// modules/user/user.controller.js

import * as userService from './user.service.js';

export async function createUser(req, res) {
    try {
        
        const user_id = req.token.id;
        
        const payload = {
            ...req.body,
            created_by: req.user.id,
            updated_by: req.user.id,
        };

        const user =
            await userService.createUser(
                payload
            );

        return res.json(user);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function listUser(req, res) {
    try {
        const user =
            await userService.getUsers(
            );

        return res.json(user);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}