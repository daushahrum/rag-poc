// modules/auth/auth.service.js

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import * as authRepository from './auth.repository.js';

export async function login(id, password) {
    console.log('LOGIN ID:', id);
    const user = await authRepository.findById(id);

    if (!user) {
        throw new Error('User not found');
    }

    const valid =
        await bcrypt.compare(
            password,
            user.password
        );

    if (!valid) {
        throw new Error('Invalid password');
    }

    const token = jwt.sign(
        {
            id: user.id,
            role: user.role,
        },
        process.env.JWT_SECRET,
        {
            
        }
    );

    await authRepository.updateLastLogin(
        user.id
    );

    return {
        token,
        user,
    };
}