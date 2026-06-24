import { models } from '../../database/db.js';

const { User } = models;

export async function createUser(payload) {
    return User.create(payload);
}

export async function updateUser(id, payload) {
    const [affectedRows] = await User.update(
        payload,
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
    return User.findByPk(id, {
        attributes: { exclude: ['password', 'reset_password_token', 'session_id'] },
    });
}

export async function getUsers(filters = {}) {
    const where = {};

    if (filters.project_id) {
        where.project_id = filters.project_id;
    }

    return User.findAll({
        where,
        attributes: { exclude: ['password', 'reset_password_token', 'session_id'] },
        order: [['name', 'ASC']],
    });
}
