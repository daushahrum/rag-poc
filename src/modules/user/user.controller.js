// modules/user/user.controller.js

import * as userService from './user.service.js';

function isAdmin(req) {
    return String(req.token?.role ?? '').trim().toLowerCase() === 'admin';
}

function scopedProjectId(req) {
    return isAdmin(req)
        ? (req.body?.project_id ?? req.query?.project_id)
        : req.token?.project_id;
}

async function canManageUser(req, userId) {
    if (isAdmin(req)) return true;
    const user = await userService.getUserById(userId);
    return user && String(user.project_id) === String(req.token?.project_id);
}

function sanitizeUser(user) {
    const data = user?.toJSON ? user.toJSON() : { ...user };
    delete data.password;
    delete data.reset_password_token;
    delete data.session_id;
    return data;
}

export async function createUser(req, res) {
    try {
        const payload = {
            ...req.body,
            project_id: scopedProjectId(req),
            ...(!isAdmin(req) && { role: 'project_owner' }),
            created_by: req.token.id,
            updated_by: req.token.id,
        };

        const user =
            await userService.createUser(
                payload
            );

        return res.json(sanitizeUser(user));
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function updateUser(req, res) {
    try {
        if (!await canManageUser(req, req.body.id)) {
            return res.status(403).json({ message: 'You cannot update this user' });
        }

        const payload = {
            ...req.body,
            project_id: scopedProjectId(req),
            ...(!isAdmin(req) && { role: 'project_owner' }),
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
        if (String(req.body.id) === String(req.token?.id)) {
            return res.status(400).json({ message: 'You cannot delete your own account' });
        }

        if (!await canManageUser(req, req.body.id)) {
            return res.status(403).json({ message: 'You cannot delete this user' });
        }

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
                { project_id: scopedProjectId(req) }
            );

        return res.json(user);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}

export async function getUser(req, res) {
    try {
        const user =
            await userService.getUserById(
                req.params.id
            );

        return res.json(user);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
}
