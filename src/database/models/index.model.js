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
import ChatResponseAuditsModel from './chatResponseAudits.model.js';
import QueryQualityCountsModel from './queryQualityCounts.model.js';
import QueryQualityDailyModel from './queryQualityDaily.model.js';
import QueryQualityStatusBreakdownModel from './queryQualityStatusBreakdown.model.js';
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
        ChatResponseAudits: ChatResponseAuditsModel(sequelize),
        QueryQualityCounts: QueryQualityCountsModel(sequelize),
        QueryQualityDaily: QueryQualityDailyModel(sequelize),
        QueryQualityStatusBreakdown: QueryQualityStatusBreakdownModel(sequelize),
        ProjectUser: ProjectUserModel(sequelize),
    };

    Object.values(models).forEach((m) => {
        if (typeof m.associate === 'function') m.associate(models);
    });

    models.ChatResponseAudits.belongsTo(models.ChatMessages, {
        as: 'assistant_message',
        foreignKey: 'message_id',
        targetKey: 'id',
        constraints: false,
    });

    models.ChatResponseAudits.belongsTo(models.ChatMessages, {
        as: 'user_message',
        foreignKey: 'user_message_id',
        targetKey: 'id',
        constraints: false,
    });

    models.ChatResponseAudits.belongsTo(models.ChatSessions, {
        as: 'chat_session',
        foreignKey: 'chat_session_id',
        targetKey: 'id',
        constraints: false,
    });

    models.ChatSessions.belongsTo(models.ProjectUser, {
        as: 'project_user',
        foreignKey: 'project_user_id',
        targetKey: 'id',
        constraints: false,
    });

    return models;
}
