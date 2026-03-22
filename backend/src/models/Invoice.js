const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const RawInvoice = require('./RawInvoice');

const Invoice = sequelize.define('Invoice', {
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
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  source_phone: {
    type: DataTypes.STRING(25),
  },
  destination_phone: {
    type: DataTypes.STRING(25),
  },
  item_date: {
    type: DataTypes.DATEONLY,
  },
  item_time: {
    type: DataTypes.TIME,
  },
  description: {
    type: DataTypes.STRING(255),
  },
  duration: {
    type: DataTypes.STRING(30),
  },
  quantity: {
    type: DataTypes.DECIMAL(15, 4),
  },
  total_value: {
    type: DataTypes.DECIMAL(12, 2),
  },
  charged_value: {
    type: DataTypes.DECIMAL(12, 2),
  },
  section: {
    type: DataTypes.STRING(100),
  },
  sub_section: {
    type: DataTypes.STRING(100),
  },
  original_cost_center: {
    type: DataTypes.STRING(100),
  },
  original_user: {
    type: DataTypes.STRING(100),
  },
  tax_type: {
    type: DataTypes.STRING(50),
  },
  source_location: {
    type: DataTypes.STRING(100),
  },
  destination_location: {
    type: DataTypes.STRING(100),
  },
  item_hash: {
    type: DataTypes.STRING(64),
  },
  raw_invoice_id: {
    type: DataTypes.UUID,
    references: {
      model: RawInvoice,
      key: 'id'
    }
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  }
}, {
  tableName: 'invoices',
  schema: 'public',
  timestamps: true,
  underscored: true,
});

// Associations
RawInvoice.hasMany(Invoice, { foreignKey: 'raw_invoice_id', as: 'items' });
Invoice.belongsTo(RawInvoice, { foreignKey: 'raw_invoice_id', as: 'header' });

module.exports = Invoice;
