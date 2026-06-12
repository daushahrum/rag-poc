// modules/user/user.controller.js

import * as userService from './user.service.js';

export async function createUser(req, res) {
    try {

        const payload = {
            ...req.body,
            created_by: req.token.id,
            updated_by: req.token.id,
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

export async function updateUser(req, res) {
    try {

        const payload = {
            ...req.body,
            updated_by: req.token.id,
        };

        const user =
            await userService.updateUser(
                payload
            );

        return res.status(200).json({
            message: "User updated"
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function deleteUser(req, res) {
    try {
        const user =
            await userService.deleteUser(
                req.body.id
            );
        return res.status(200).json({
            message: "User deleted"
        });
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