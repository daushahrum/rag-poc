// modules/auth/auth.middleware.js

import jwt from 'jsonwebtoken';

export function authenticate(
    req,
    res,
    next
) {
    const authHeader =
        req.headers.authorization;

    if (!authHeader) {
        return res
            .status(401)
            .json({
                message: 'Unauthorized',
            });
    }

    const token =
        authHeader.replace(
            'Bearer ',
            ''
        );

    try {
        req.token = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        next();
    } catch {
        return res
            .status(401)
            .json({
                message: 'Invalid token',
            });
    }
}

export function authorizeAdminCreation(
    req,
    res,
    next
) {
    const requestedRole = String(req.body?.role ?? '')
        .trim()
        .toLowerCase();

    if (requestedRole !== 'admin') {
        return next();
    }

    const creatorRole = String(req.token?.role ?? '')
        .trim()
        .toLowerCase();

    if (creatorRole !== 'admin') {
        return res
            .status(403)
            .json({
                message: 'Only admins can create admin users',
            });
    }

    next();
}
