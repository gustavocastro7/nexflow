const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Workspace = require('./Workspace');

const Collaborator = sequelize.define('Collaborator', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  external_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  workspace_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Workspace,
      key: 'id'
    }
  },
}, {
  tableName: 'collaborators',
  schema: 'public',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['workspace_id'] },
    { fields: ['external_id'] },
  ]
});

Workspace.hasMany(Collaborator, { foreignKey: 'workspace_id', as: 'collaborators' });
Collaborator.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

module.exports = Collaborator;
