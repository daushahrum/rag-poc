import { models } from '../../database/db.js';

const { User } = models;

export async function createUser(payload) {
    return User.create(payload);
}

export async function updateUser(id, data) {
    const [affectedRows] = await User.update(
        data,
        {
            where: { id },
        }
    );

    return affectedRows;
}

export async function deleteUser(id) {
    return User.destroy({
        where: { id },
    });
}

export async function getUserById(id) {
    return User.findByPk(id);
}

export async function getUsers() {
    return User.findAll();
}