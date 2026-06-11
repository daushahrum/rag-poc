import { DataTypes } from 'sequelize';

export default function ToolModel(sequelize) {
    return sequelize.define(
        'Tool',
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4,
            },

            project_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
            },

            tool_name: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },

            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            endpoint: {
                type: DataTypes.STRING(500),
                allowNull: false,
            },

            method: {
                type: DataTypes.STRING(10),
                allowNull: false,
                defaultValue: 'GET',
            },

            path_params: {
                type: DataTypes.JSONB,
                allowNull: true,
            },

            query_params: {
                type: DataTypes.JSONB,
                allowNull: true,
            },

            body_schema: {
                type: DataTypes.JSONB,
                allowNull: true,
            },

            example_payload: {
                type: DataTypes.JSONB,
                allowNull: true,
            },

            response_schema: {
                type: DataTypes.JSONB,
                allowNull: true,
            },

            version: {
                type: DataTypes.STRING(20),
                allowNull: true,
                defaultValue: '1.0.0',
            },

            is_enabled: {
                type: DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: true,
            },
        },
        {
            tableName: 'tools',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        }
    );
}