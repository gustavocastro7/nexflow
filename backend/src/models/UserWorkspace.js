const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Workspace = require('./Workspace');

const UserWorkspace = sequelize.define('UserWorkspace', {
  user_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  workspace_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: Workspace,
      key: 'id'
    }
  },
}, {
  tableName: 'user_workspaces',
  schema: 'public',
  timestamps: true,
  underscored: true,
});

User.belongsToMany(Workspace, { through: UserWorkspace, foreignKey: 'user_id', as: 'workspaces' });
Workspace.belongsToMany(User, { through: UserWorkspace, foreignKey: 'workspace_id', as: 'users' });
UserWorkspace.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserWorkspace.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });


module.exports = UserWorkspace;

