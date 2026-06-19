// modules/auth/auth.service.js

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import * as authRepository from './auth.repository.js';
import * as projectUserRepository from '../project/projectUser/projectUser.repository.js';
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

    let project_user_id = await projectUserRepository.getProjectUser({external_user_id: id}).id;

    const token = jwt.sign(
        {
            id: user.id,
            role: user.role,
            project_id: user.project_id,
            project_user_id: project_user_id
        },
        process.env.JWT_SECRET,
        {}
    );

    await authRepository.updateLastLogin(
        user.id
    );

    return {
        token,
        user,
    };
}
export async function changePassword(payload) {
    const id = payload.id;
    const old_password = payload.old_password;
    const new_password = payload.new_password;
    const updated_by = payload.updated_by;

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

    await authRepository.updatePassword( 
        user.id,
        new_password,
        updated_by
    );

    return {
        message: 'Change password successful.'
    };
}