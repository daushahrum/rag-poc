// modules/auth/auth.repository.js

import { models } from '../../database/db.js';

const { User } = models;

export async function findById(id) {
    console.log('Looking for user:', id);

    const user = await User.findByPk(id);

    console.log('Found user:', user?.id);

    return user;
}

export async function findByEmail(email) {
    return User.findOne({
        where: { email },
    });
}

export async function updateLastLogin(id) {
    return User.update(
        {
            last_login_at: new Date(),
        },
        {
            where: { id },
        }
    );
}

export async function updateSession(id, sessionId) {
    return User.update(
        {
            session_id: sessionId,
        },
        {
            where: { id },
        }
    );
}