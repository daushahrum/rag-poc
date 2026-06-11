const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Tool extends Model {}

Tool.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    projectId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'project_id',
    },

    toolName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'tool_name',
    },

    description: {
      type: DataTypes.TEXT,
    },

    endpoint: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },

    method: {
      type: DataTypes.STRING(10),
      defaultValue: 'GET',
    },

    pathParams: {
      type: DataTypes.JSONB,
      field: 'path_params',
    },

    queryParams: {
      type: DataTypes.JSONB,
      field: 'query_params',
    },

    bodySchema: {
      type: DataTypes.JSONB,
      field: 'body_schema',
    },

    examplePayload: {
      type: DataTypes.JSONB,
      field: 'example_payload',
    },

    responseSchema: {
      type: DataTypes.JSONB,
      field: 'response_schema',
    },

    version: {
      type: DataTypes.STRING(20),
      defaultValue: '1.0.0',
    },

    isEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_enabled',
    },

    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
    },

    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'tools',
    timestamps: false,
  }
);

module.exports = Tool;
