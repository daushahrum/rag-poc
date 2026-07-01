import { DataTypes } from 'sequelize';

export default function ChatMessagesModel(sequelize) {
    return sequelize.define(
        'ChatMessages',
        {
            id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
            session_id: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'chat_sessions',
                    key: 'id',
                },
            },
            role: { type: DataTypes.TEXT, allowNull: false },
            content: { type: DataTypes.TEXT, allowNull: false },
            low_confidence: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
            confidence_reasons: { type: DataTypes.JSONB, allowNull: true },
            created_at: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW }
        },
        {
            tableName: 'chat_messages',
            timestamps: false,
        }
    );
}
