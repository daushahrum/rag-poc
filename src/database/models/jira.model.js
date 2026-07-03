// modules/jira/jira.model.js

import { DataTypes } from 'sequelize';

export default function defineJiraConnection(sequelize) {
    const JiraConnection = sequelize.define('JiraConnection', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        projectId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            unique: true,
        },
        accessToken: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        refreshToken: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        cloudId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        siteName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        siteUrl: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        jiraProjectKey: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        jiraProjectName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        scopes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        createdBy: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        updatedBy: {
            type: DataTypes.TEXT,
            allowNull: true,
        }
    }, {
        tableName: 'jira_connections',
        timestamps: true,
        underscored: true,
    });

    return JiraConnection;
}
