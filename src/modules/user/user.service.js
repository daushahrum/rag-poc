// modules/user/user.service.js

import bcrypt from 'bcrypt';

import * as userRepository from './user.repository.js';

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

    return userRepository.createUser({
        ...payload,
        password: hash,
        active: true,
    });
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
