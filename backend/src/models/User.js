const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  profile: {
    type: DataTypes.ENUM('jedi', 'admin', 'user'),
    allowNull: false,
    defaultValue: 'user',
  },
  default_workspace_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'users',
  schema: 'public',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeSave: async (user) => {
      if (user.password_hash && user.changed('password_hash')) {
        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(user.password_hash, salt);
        console.log(`Password hashed for user: ${user.email}`);
      }
    },
  },
});

User.prototype.checkPassword = function(password) {
  return bcrypt.compare(password, this.password_hash);
};

module.exports = User;
