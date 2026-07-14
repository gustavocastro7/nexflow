import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import { getSequelize } from '../config/database.js';

let initialized = false;
const cache = {};

export function initModels() {
  if (initialized) return;
  initialized = true;
  const s = getSequelize();

  const User = s.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    profile: { type: DataTypes.ENUM('jedi', 'admin', 'user'), allowNull: false, defaultValue: 'user' },
    default_workspace_id: { type: DataTypes.UUID, allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    tableName: 'users', timestamps: true, underscored: true,
    hooks: {
      beforeSave: async (user) => {
        if (user.password_hash && user.changed('password_hash')) {
          const salt = await bcrypt.genSalt(10);
          user.password_hash = await bcrypt.hash(user.password_hash, salt);
        }
      },
    },
  });
  User.prototype.checkPassword = function (password) {
    return bcrypt.compare(password, this.password_hash);
  };

  const Workspace = s.define('Workspace', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    schema_name: { type: DataTypes.STRING, allowNull: false, unique: true },
    status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
    billing_cycle_start_day: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    logo: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'workspaces', timestamps: true, underscored: true,
  });

  const Role = s.define('Role', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'roles', timestamps: true, underscored: true,
  });

  const UserWorkspace = s.define('UserWorkspace', {
    user_id: { type: DataTypes.UUID, primaryKey: true, references: { model: User, key: 'id' } },
    workspace_id: { type: DataTypes.UUID, primaryKey: true, references: { model: Workspace, key: 'id' } },
  }, {
    tableName: 'user_workspaces', timestamps: true, underscored: true,
  });

  const UserConfig = s.define('UserConfig', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false, unique: true, references: { model: User, key: 'id' } },
    theme_mode: { type: DataTypes.ENUM('light', 'dark'), defaultValue: 'light' },
    language: { type: DataTypes.STRING(10), defaultValue: 'pt-BR' },
    last_login: { type: DataTypes.DATE, allowNull: true },
    last_workspace_id: { type: DataTypes.UUID, allowNull: true, references: { model: Workspace, key: 'id' } },
    menu_behavior: { type: DataTypes.ENUM('always_open', 'hover', 'collapsible'), defaultValue: 'collapsible' },
  }, {
    tableName: 'user_configs', timestamps: true, underscored: true,
  });

  const UserSecurity = s.define('UserSecurity', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false, unique: true, references: { model: User, key: 'id' } },
    two_factor_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, {
    tableName: 'user_securities', timestamps: true, underscored: true,
  });

  const Collaborator = s.define('Collaborator', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    external_id: { type: DataTypes.STRING(50), allowNull: true },
    email: { type: DataTypes.STRING(150), allowNull: true },
    department: { type: DataTypes.STRING(100), allowNull: true },
    workspace_id: { type: DataTypes.UUID, allowNull: false, references: { model: Workspace, key: 'id' } },
  }, {
    tableName: 'collaborators', timestamps: true, underscored: true,
    indexes: [{ fields: ['workspace_id'] }, { fields: ['external_id'] }],
  });

  const CostCenter = s.define('CostCenter', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    code: { type: DataTypes.STRING(50), allowNull: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    phones: { type: DataTypes.JSON, defaultValue: [] },
    workspace_id: { type: DataTypes.UUID, allowNull: false, references: { model: Workspace, key: 'id' } },
  }, {
    tableName: 'cost_centers', timestamps: true, underscored: true,
  });

  const PhoneLine = s.define('PhoneLine', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    phone_number: { type: DataTypes.STRING(25), allowNull: false },
    responsible_name: { type: DataTypes.STRING(150), allowNull: true },
    responsible_id: { type: DataTypes.STRING(50), allowNull: true },
    collaborator_id: { type: DataTypes.UUID, allowNull: true, references: { model: Collaborator, key: 'id' } },
    cost_center_id: { type: DataTypes.UUID, allowNull: true, references: { model: CostCenter, key: 'id' } },
    workspace_id: { type: DataTypes.UUID, allowNull: false, references: { model: Workspace, key: 'id' } },
  }, {
    tableName: 'phone_lines', timestamps: true, underscored: true,
    indexes: [{ fields: ['workspace_id'] }, { fields: ['cost_center_id'] }, { fields: ['phone_number'] }, { fields: ['collaborator_id'] }],
  });

  const RawInvoice = s.define('RawInvoice', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspace_id: { type: DataTypes.UUID, allowNull: false },
    operator: { type: DataTypes.ENUM('claro', 'vivo', 'claro_txt'), allowNull: false },
    content: { type: DataTypes.JSON, allowNull: false },
    due_date: { type: DataTypes.DATEONLY, allowNull: true },
    hash: { type: DataTypes.STRING, allowNull: false },
    processing_status: { type: DataTypes.ENUM('pendente', 'processado', 'erro'), defaultValue: 'pendente' },
  }, {
    tableName: 'raw_invoices', timestamps: true, underscored: true,
    indexes: [{ unique: true, fields: ['workspace_id', 'operator', 'hash'] }],
  });

  const Invoice = s.define('Invoice', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspace_id: { type: DataTypes.UUID, allowNull: false },
    operator: { type: DataTypes.STRING(20), allowNull: false },
    source_phone: { type: DataTypes.STRING(25) },
    destination_phone: { type: DataTypes.STRING(25) },
    item_date: { type: DataTypes.DATEONLY },
    item_time: { type: DataTypes.TIME },
    description: { type: DataTypes.STRING(255) },
    duration: { type: DataTypes.STRING(30) },
    quantity: { type: DataTypes.DECIMAL(15, 4) },
    total_value: { type: DataTypes.DECIMAL(12, 2) },
    charged_value: { type: DataTypes.DECIMAL(12, 2) },
    section: { type: DataTypes.STRING(100) },
    sub_section: { type: DataTypes.STRING(100) },
    original_cost_center: { type: DataTypes.STRING(100) },
    original_user: { type: DataTypes.STRING(100) },
    tax_type: { type: DataTypes.STRING(50) },
    source_location: { type: DataTypes.STRING(100) },
    destination_location: { type: DataTypes.STRING(100) },
    item_hash: { type: DataTypes.STRING(64) },
    raw_invoice_id: { type: DataTypes.UUID },
    metadata: { type: DataTypes.JSON, defaultValue: {} },
  }, {
    tableName: 'invoices', timestamps: true, underscored: true,
  });

  const AssociationHistory = s.define('AssociationHistory', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    workspace_id: { type: DataTypes.UUID, allowNull: false },
    action: { type: DataTypes.STRING, allowNull: false },
  }, {
    tableName: 'association_histories', timestamps: true, underscored: true,
  });

  const OperationLog = s.define('OperationLog', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    workspace_id: { type: DataTypes.UUID, allowNull: false },
    action: { type: DataTypes.STRING, allowNull: false },
    entity: { type: DataTypes.STRING, allowNull: true },
    entity_id: { type: DataTypes.UUID, allowNull: true },
    ip_address: { type: DataTypes.STRING, allowNull: true },
    payload: { type: DataTypes.JSON, allowNull: true },
  }, {
    tableName: 'operation_logs', timestamps: true, underscored: true,
  });

  // Associations

  // User ↔ Workspace (many-to-many)
  User.belongsToMany(Workspace, { through: UserWorkspace, foreignKey: 'user_id', as: 'workspaces' });
  Workspace.belongsToMany(User, { through: UserWorkspace, foreignKey: 'workspace_id', as: 'users' });
  UserWorkspace.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  UserWorkspace.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

  // User → UserConfig
  User.hasOne(UserConfig, { foreignKey: 'user_id', as: 'config' });
  UserConfig.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  UserConfig.belongsTo(Workspace, { foreignKey: 'last_workspace_id', as: 'lastWorkspace' });

  // User → UserSecurity
  User.hasOne(UserSecurity, { foreignKey: 'user_id', as: 'security' });
  UserSecurity.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // Workspace → Collaborator
  Workspace.hasMany(Collaborator, { foreignKey: 'workspace_id', as: 'collaborators' });
  Collaborator.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

  // Workspace → CostCenter
  Workspace.hasMany(CostCenter, { foreignKey: 'workspace_id', as: 'costCenters' });
  CostCenter.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

  // CostCenter → PhoneLine
  CostCenter.hasMany(PhoneLine, { foreignKey: 'cost_center_id', as: 'phoneLines' });
  PhoneLine.belongsTo(CostCenter, { foreignKey: 'cost_center_id', as: 'costCenter' });

  // Workspace → PhoneLine
  Workspace.hasMany(PhoneLine, { foreignKey: 'workspace_id', as: 'phoneLines' });
  PhoneLine.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

  // Collaborator → PhoneLine
  Collaborator.hasMany(PhoneLine, { foreignKey: 'collaborator_id', as: 'phoneLines' });
  PhoneLine.belongsTo(Collaborator, { foreignKey: 'collaborator_id', as: 'collaborator' });

  // RawInvoice → Invoice
  RawInvoice.hasMany(Invoice, { foreignKey: 'raw_invoice_id', as: 'items' });
  Invoice.belongsTo(RawInvoice, { foreignKey: 'raw_invoice_id', as: 'header' });

  // OperationLog → User, Workspace
  OperationLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  OperationLog.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

  // Populate cache
  const models = s.models;
  cache.User = models.User;
  cache.Workspace = models.Workspace;
  cache.Role = models.Role;
  cache.UserWorkspace = models.UserWorkspace;
  cache.UserConfig = models.UserConfig;
  cache.UserSecurity = models.UserSecurity;
  cache.Collaborator = models.Collaborator;
  cache.CostCenter = models.CostCenter;
  cache.PhoneLine = models.PhoneLine;
  cache.Invoice = models.Invoice;
  cache.RawInvoice = models.RawInvoice;
  cache.AssociationHistory = models.AssociationHistory;
  cache.OperationLog = models.OperationLog;
}

export function getModel(name) {
  initModels();
  return cache[name];
}
