import { DataTypes } from 'sequelize';

export default function ProjectModel(sequelize) {
    return sequelize.define(
        'Project',
        {
            id: {
                type: DataTypes.BIGINT,
                primaryKey: true,
                autoIncrement: true,
            },

            code: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true,
            },

            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },

            project_key_hash: {
                type: DataTypes.TEXT,
                allowNull: false,
            },

            is_active: {
                type: DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: true,
            },
        },
        {
            tableName: 'projects',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        }
    );
}