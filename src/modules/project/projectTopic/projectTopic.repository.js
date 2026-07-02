import { Op } from 'sequelize';
import { models } from '../../../database/db.js';

const { ProjectTopic } = models;

export async function createTopic(payload) {
    return ProjectTopic.create(payload);
}

export async function updateTopic(id, payload) {
    const [affectedRows] = await ProjectTopic.update(
        payload,
        {
            where: { id },
        }
    );

    return affectedRows;
}

export async function deleteTopic(id) {
    return ProjectTopic.destroy({
        where: { id },
    });
}

export async function getTopicById(id) {
    return ProjectTopic.findByPk(id);
}

export async function getTopic(filters = {}) {
    return ProjectTopic.findOne({
        where: filters,
    });
}

export async function getTopics(filters = {}) {
    return ProjectTopic.findAll({
        where: filters,
        order: [
            ['is_active', 'DESC'],
            ['name', 'ASC'],
        ],
    });
}

export async function getTopicByName(projectId, name, excludeId = null) {
    const where = {
        project_id: projectId,
        name: {
            [Op.iLike]: String(name).trim(),
        },
    };

    if (excludeId) {
        where.id = {
            [Op.ne]: excludeId,
        };
    }

    return ProjectTopic.findOne({
        where,
    });
}
