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

    if (!password) {
        throw new Error('Password is required');
    }

    if (!email) {
        throw new Error('Email is required');
    }

    // hash password
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

    await projectUserRepository.createProjectUser({
        id: `${project.code}_${payload.id}`,
        project_id: payload.project_id,
        external_user_id: payload.id,
        name: payload.name,
        user_type: 'portal',
    });

    return user;
}
export async function deleteUser(id) {
    return userRepository.deleteUser(id);
}

export async function updateUser(payload) {

    const id = payload.id;

    const {
        role,
        name,
        email,
        mobile,
        updated_by,
        project_id,
    } = payload;

    return userRepository.updateUser(id, payload);
}

export async function getUsers() {
    return userRepository.getUsers();
}

export async function getUserById(id) {
    return userRepository.getUserById(id);
}
