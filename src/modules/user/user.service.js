// modules/user/user.service.js

import bcrypt from 'bcrypt';

import * as userRepository from './user.repository.js';
import * as projectUserRepository from '../project/projectUser/projectUser.repository.js';
import * as projectRepository from '../project/project.repository.js';

export async function createUser(payload) {
    const {
        id,
        password,
        role,
        name,
        email,
        mobile,
        created_by,
        updated_by,
        project_id,
    } = payload;

    if (!id) {
        throw new Error('User ID is required');
    }
    
    if (!role) {
        throw new Error('User role is required');
    }

    if (!password) {
        throw new Error('Password is required');
    }

    if (!email) {
        throw new Error('Email is required');
    }

    const hash = await bcrypt.hash(password, 10);

    const project = await projectRepository.getProjectById(
        payload.project_id
    );

    if (!project) {
        throw new Error('Project not found');
    }

    const user = await userRepository.createUser({
        ...payload,
        password: hash,
        active: true,
    });

    if(role == 'project_owner'){
        await projectUserRepository.createProjectUser({
            id: `${project.code}_${payload.id}`,
            project_id: payload.project_id,
            external_user_id: payload.id,
            user_type: 'portal',
        });
    }

    return user;
}
export async function deleteUser(id) {
    await projectUserRepository.deleteProjectUsersByExternalUserId(id);
    return userRepository.deleteUser(id);
}

export async function updateUser(payload) {

    const id = payload.id;

    const {
        role,
        name,
        email,
        mobile,
        active,
        password,
        updated_by,
        project_id,
    } = payload;

    const updatePayload = {
        ...(role !== undefined && { role }),
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(mobile !== undefined && { mobile }),
        ...(active !== undefined && { active }),
        ...(updated_by !== undefined && { updated_by }),
        ...(project_id !== undefined && { project_id }),
    };

    if (password) {
        updatePayload.password = await bcrypt.hash(password, 10);
        updatePayload.last_password_changed_at = new Date();
    }

    return userRepository.updateUser(id, updatePayload);
}

export async function getUsers(filters = {}) {
    return userRepository.getUsers(filters);
}

export async function getUserById(id) {
    return userRepository.getUserById(id);
}
