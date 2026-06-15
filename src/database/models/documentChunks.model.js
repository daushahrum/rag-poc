import { DataTypes } from 'sequelize';

function registerVectorType(sequelize) {
  if (!sequelize.constructor.DataTypes.VECTOR) {
    sequelize.constructor.DataTypes.VECTOR = class VECTOR extends DataTypes.ABSTRACT {
      constructor(dimensions) {
        super();
        this._dimensions = dimensions;
      }
      toSql() {
        return this._dimensions ? `vector(${this._dimensions})` : 'vector';
      }
    };
  }
  return sequelize.constructor.DataTypes.VECTOR;
}

export default function DocumentChunksModel(sequelize) {
  const VECTOR = registerVectorType(sequelize); // ← call it first, get the type back

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
      embedding: { type: new VECTOR(1536), allowNull: true },
      chunk_index: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      tableName: 'document_chunks',
      timestamps: false,
    }
  );
}