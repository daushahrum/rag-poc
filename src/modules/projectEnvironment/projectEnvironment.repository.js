// modules/projectEnvironment/projectEnvironment.repository.js

import { where } from 'sequelize';
import { models } from '../../database/db.js';

const { ProjectEnvironment } = models;

export async function createProjectEnvironment(payload) {
    return ProjectEnvironment.create(payload);
}

export async function updateProjectEnvironment(id, payload) {
    const [affectedRows] = await ProjectEnvironment.update(
        payload,
        {
            where: { id },
        }
    );

    return affectedRows;
}

export async function deleteProjectEnvironment(id) {
    return ProjectEnvironment.destroy({
        where: { id },
    });
}

export async function getProjectEnvironmentById(id) {
    return ProjectEnvironment.findByPk(id);
}

export async function getProjectEnvironmentByProjectId(project_id) {
    return ProjectEnvironment.findAll({
        where : {
            project_id : project_id
        }
    });
}

export async function getProjectEnvironments(filters = {}) {
    const where = {};

    if (filters.project_id) {
        where.project_id = filters.project_id;
    }

    if (filters.is_active !== undefined) {
        where.is_active = filters.is_active === 'true' || filters.is_active === true;
    }

    if (filters.environment) {
        where.environment = filters.environment;
    }

    return ProjectEnvironment.findAll({ where });
}
