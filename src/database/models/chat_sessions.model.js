import { DataTypes } from 'sequelize';

export default function ChatSessionsModel(sequelize) {
    return sequelize.define(
        'ChatSessions',
        {
            id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
            created_at: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
            topic: { type: DataTypes.TEXT, allowNull: true },
            project_id: { type: DataTypes.BIGINT, allowNull: true },
        },
        {
            tableName: 'chat_sessions',
            timestamps: false,
        }
    );
}