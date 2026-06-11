import { DataTypes } from 'sequelize';

export default function KnowledgeDocumentsModel(sequelize) {
    return sequelize.define(
        'KnowledgeDocuments',
        {
            id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
            title: { type: DataTypes.TEXT, allowNull: false },
            created_at: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
            project_id: { type: DataTypes.BIGINT, allowNull: true },
        },
        {
            tableName: 'knowledge_documents',
            timestamps: false,
        }
    );
}