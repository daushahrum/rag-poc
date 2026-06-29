import { models } from '../../database/db.js';
import { Op } from 'sequelize';

const { ProjectApp } = models;

export async function createApp(payload) {
    return ProjectApp.create(payload);
}

export async function updateApp(id, payload) {
    const [affectedRows] = await ProjectApp.update(
        payload,
        {
            where: { id },
        }
    );

    return affectedRows;
}

export async function deleteApp(id) {
    return ProjectApp.destroy({
        where: { id },
    });
}

export async function getAppById(id) {
    return ProjectApp.findByPk(id);
}

export async function getApp(filters = {}) {
    return ProjectApp.findOne({
        where: filters,
    });
}

export async function getApps(filters = {}) {
    return ProjectApp.findAll({
        where: filters,
    });
}

export async function getAppByProjectKey(projectId, projectKeyHashes) {
    return ProjectApp.findOne({
        where: {
            project_id: projectId,
            project_key_hash: {
                [Op.in]: projectKeyHashes,
            },
        },
    });
}
