const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Workspace = sequelize.define('Workspace', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  schema_name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active',
  },
  billing_cycle_start_day: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'workspaces',
  schema: 'public',
  timestamps: true,
  underscored: true,
});

module.exports = Workspace;
