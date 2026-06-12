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