import { models } from '../../database/db.js';

const { ProjectUser } = models;

export async function createProjectUser(payload) {
    return ProjectUser.create(payload);
}

export async function updateProjectUser(id, payload) {
    const [affectedRows] = await ProjectUser.update(
        payload,
        {
            where: { id },
        }
    );

    return affectedRows;
}

export async function deleteProjectUser(id) {
    return ProjectUser.destroy({
        where: { id },
    });
}

export async function getProjectUserById(id) {
    return ProjectUser.findByPk(id);
}

export async function getProjectUsers() {
    return ProjectUser.findAll();
}