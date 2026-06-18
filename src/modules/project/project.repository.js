import { models } from '../../database/db.js';

const { Project } = models;

export async function createProject(payload) {
    return Project.create(payload);
}

export async function updateProject(id, payload) {
    const [affectedRows] = await Project.update(
        payload,
        {
            where: { id },
        }
    );

    return affectedRows;
}

export async function deleteProject(id) {
    return Project.destroy({
        where: { id },
    });
}

export async function getProjectById(id) {
    return Project.findByPk(id);
}

export async function getProjectByCode(code) {
    return Project.findOne({
        where: { code },
    });
}

export async function getProjects() {
    return Project.findAll();
}