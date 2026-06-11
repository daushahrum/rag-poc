const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class ProjectEnvironment extends Model {}

ProjectEnvironment.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    projectId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'project_id',
    },

    environment: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    baseUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'base_url',
    },

    authType: {
      type: DataTypes.STRING(50),
      defaultValue: 'none',
      field: 'auth_type',
    },

    authConfig: {
      type: DataTypes.JSONB,
      field: 'auth_config',
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
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
    tableName: 'project_environments',
    timestamps: false,
  }
);

module.exports = ProjectEnvironment;