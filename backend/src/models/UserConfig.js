const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Workspace = require('./Workspace');

const UserConfig = sequelize.define('UserConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  theme_mode: {
    type: DataTypes.ENUM('light', 'dark'),
    defaultValue: 'light',
  },
  language: {
    type: DataTypes.STRING(10),
    defaultValue: 'pt-BR',
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  last_workspace_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Workspace,
      key: 'id'
    }
  },
}, {
  tableName: 'user_configs',
  schema: 'public',
  timestamps: true,
  underscored: true,
});

// Associations
User.hasOne(UserConfig, { foreignKey: 'user_id', as: 'config' });
UserConfig.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

UserConfig.belongsTo(Workspace, { foreignKey: 'last_workspace_id', as: 'lastWorkspace' });

module.exports = UserConfig;
