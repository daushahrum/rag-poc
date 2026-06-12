// modules/auth/auth.service.js

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import * as authRepository from './auth.repository.js';
import * as textValidators from '../../utils/textValidators.js';

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
export async function changePassword({ req }, id, old_password, new_password) {
    console.log('LOGIN ID:', id);

    // ** Check valid id
    const user = await authRepository.findById(id);
    if (!user) {
        throw new Error('User not found');
    }

    // ** Check valid old_password
    const validOldPassword =
        await bcrypt.compare(
            old_password,
            user.password
        );
    if (!validOldPassword) {
        throw new Error('Invalid old password');
    }

    // ** Check new_password validation
    const validNewPassword =
        await textValidators.password(
            new_password
        );
    if (!validNewPassword) {
        throw new Error('Invalid new password');
    } else if (!validNewPassword.valid) {
        throw new Error(validNewPassword.message);
    }

    await authRepository.updatePassword( { req }, 
        user.id,
        new_password
    );

    return {
        message: 'Change password successful.'
    };
}