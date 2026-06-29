import { Sequelize } from 'sequelize';
import ToolModel from './tool.model.js';
import UserModel from './user.model.js';
import ProjectModel from './project.model.js';
import ProjectAppModel from './projectApp.model.js';
import ProjectEnvironmentModel from './projectEnvironment.model.js';
import KnowledgeDocumentsModel from './knowledgeDocuments.model.js';
import DocumentChunksModel from './documentChunks.model.js';
import ChatMessagesModel from './chatMessages.model.js';
import ChatSessionsModel from './chatSessions.model.js';
import ProjectUserModel from './projectUser.model.js';

export function initModels(sequelize) {
    const models = {
        User: UserModel(sequelize),
        Tool: ToolModel(sequelize),
        Project: ProjectModel(sequelize),
        ProjectApp: ProjectAppModel(sequelize),
        ProjectEnvironment: ProjectEnvironmentModel(sequelize),
        KnowledgeDocuments: KnowledgeDocumentsModel(sequelize),
        DocumentChunks: DocumentChunksModel(sequelize),
        ChatSessions: ChatSessionsModel(sequelize),
        ChatMessages: ChatMessagesModel(sequelize),
        ProjectUser: ProjectUserModel(sequelize),
    };

    Object.values(models).forEach((m) => {
        if (typeof m.associate === 'function') m.associate(models);
    });

    return models;
}
