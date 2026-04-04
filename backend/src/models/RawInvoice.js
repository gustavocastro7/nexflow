const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RawInvoice = sequelize.define('RawInvoice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  workspace_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  operator: {
    type: DataTypes.ENUM('claro', 'vivo', 'claro_txt'),
    allowNull: false,
  },
  content: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  processing_status: {
    type: DataTypes.ENUM('pendente', 'processado', 'erro'),
    defaultValue: 'pendente',
  },
}, {
  tableName: 'raw_invoices',
  schema: 'public',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['workspace_id', 'operator', 'hash']
    }
  ]
});

module.exports = RawInvoice;
