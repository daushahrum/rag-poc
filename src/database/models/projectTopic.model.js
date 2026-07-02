import { DataTypes } from 'sequelize';

export default function ProjectTopicModel(sequelize) {
    return sequelize.define(
        'ProjectTopic',
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4,
            },

            project_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
            },

            name: {
                type: DataTypes.TEXT,
                allowNull: false,
            },

            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            keywords: {
                type: DataTypes.ARRAY(DataTypes.TEXT),
                allowNull: true,
            },

            is_active: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
        },
        {
            tableName: 'project_topics',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        }
    );
}
