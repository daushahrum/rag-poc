import { models } from '../../../database/db.js';

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

export async function deleteProjectUsersByExternalUserId(external_user_id) {
    return ProjectUser.destroy({
        where: { external_user_id },
    });
}

export async function getProjectUserById(id) {
    return ProjectUser.findByPk(id);
}

export async function getProjectUser(filters = {}) {
    console.log('finding project user', filters)
    return ProjectUser.findOne({
        where: filters,
    });
}

export async function getProjectUsers(filters = {}) {
    return ProjectUser.findAll({
        where: filters,
    });
}

export async function getProjectUserByExternalUserId(projectId, externalUserId) {
    return ProjectUser.findOne({
        where: {
            project_id: projectId,
            external_user_id: externalUserId,
        },
    });
}
