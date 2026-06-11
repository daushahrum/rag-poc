import { DataTypes } from 'sequelize';

export default function ProjectEnvironmentModel(sequelize) {
    return sequelize.define(
        'ProjectEnvironment',
        {
            id: {
                type: DataTypes.BIGINT,
                primaryKey: true,
                autoIncrement: true,
            },

            project_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
            },

            environment: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },

            base_url: {
                type: DataTypes.TEXT,
                allowNull: false,
            },

            auth_type: {
                type: DataTypes.STRING(50),
                allowNull: false,
                defaultValue: 'none',
            },

            auth_config: {
                type: DataTypes.JSONB,
                allowNull: true,
            },

            is_active: {
                type: DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: true,
            },
        },
        {
            tableName: 'project_environments',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        }
    );
}