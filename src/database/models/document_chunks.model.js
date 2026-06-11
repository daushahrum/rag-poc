import { DataTypes } from 'sequelize';

export default function DocumentChunksModel(sequelize) {
    return sequelize.define(
        'DocumentChunks',
        {
            id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
            document_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: {
                    model: 'knowledge_documents',
                    key: 'id',
                },
            },
            content: { type: DataTypes.TEXT, allowNull: false },
            embedding: { type: DataTypes.VECTOR, allowNull: true },
            chunk_index: { type: DataTypes.INTEGER, allowNull: false },
            project_id: { type: DataTypes.BIGINT, allowNull: true },
        },
        {
            tableName: 'document_chunks',
            timestamps: false,
        }
    );
}