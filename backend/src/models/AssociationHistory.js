const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AssociationHistory = sequelize.define('AssociationHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  workspace_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'association_histories',
  schema: 'public',
  timestamps: true,
  underscored: true,
});

module.exports = AssociationHistory;
