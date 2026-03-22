const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const UserSecurity = sequelize.define('UserSecurity', {
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
  two_factor_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'user_securities',
  schema: 'public',
  timestamps: true,
  underscored: true,
});

module.exports = UserSecurity;
