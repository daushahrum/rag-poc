// modules/tool/tool.repository.js

import { models } from '../../database/db.js';

const { Tool } = models;

export async function createTool(payload) {
    return Tool.create(payload);
}

export async function updateTool(id, payload) {
    const [affectedRows] = await Tool.update(
        payload,
        {
            where: { id },
        }
    );

    return affectedRows;
}

export async function deleteTool(id) {
    return Tool.destroy({
        where: { id },
    });
}

export async function getToolById(id) {
    return Tool.findByPk(id);
}

export async function getProjectTools(project_id) {
    return Tool.findAll({
        where : {
            project_id : project_id
        }
    });
}

export async function getTools(filters = {}) {
    const where = {};

    if (filters.project_id) {
        where.project_id = filters.project_id;
    }

    if (filters.is_enabled !== undefined) {
        where.is_enabled = filters.is_enabled === 'true' || filters.is_enabled === true;
    }

    return Tool.findAll({ where });
}