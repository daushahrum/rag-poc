// modules/jira/jira.repository.js

import { models } from '../../database/db.js';

const { JiraConnection } = models;

export async function createConnection(payload) {
    return JiraConnection.create(payload);
}

export async function updateConnection(id, payload) {
    const [affectedRows] = await JiraConnection.update(
        payload,
        {
            where: { id },
        }
    );

    return affectedRows;
}

export async function deleteConnection(id) {
    return JiraConnection.destroy({
        where: { id },
    });
}

export async function deleteConnectionByProjectId(projectId) {
    return JiraConnection.destroy({
        where: { projectId },
    });
}

export async function getConnectionById(id) {
    return JiraConnection.findByPk(id);
}

export async function getConnectionByProjectId(projectId) {
    return JiraConnection.findOne({
        where: { projectId },
    });
}
