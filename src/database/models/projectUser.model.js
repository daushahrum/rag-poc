import { DataTypes } from 'sequelize';

export default function ProjectUserModel(sequelize) {
    return sequelize.define(
        'ProjectUser',
        {
            id: {
                type: DataTypes.TEXT,
                primaryKey: true,
                allowNull: false,
            },

            project_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
            },

            external_user_id: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            user_type: {
                type: DataTypes.TEXT,
                allowNull: false,
                defaultValue: 'external',
            },
        },
        {
            tableName: 'project_users',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: false,
        }
    );
}