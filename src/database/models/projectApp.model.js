import { DataTypes } from 'sequelize';

export default function ProjectAppModel(sequelize) {
    return sequelize.define(
        'ProjectApp',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },

            project_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
            },

            name: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },

            platform: {
                type: DataTypes.STRING(20),
                allowNull: false,
            },

            project_key_hash: {
                type: DataTypes.STRING(255),
                allowNull: false,
                unique: true,
            },

            status: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: 'active',
            },
        },
        {
            tableName: 'project_apps',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        }
    );
}
