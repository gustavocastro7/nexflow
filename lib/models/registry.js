import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const uuidId = () => ({ _id: { type: String, default: () => randomUUID() } });
const timestamps = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
};

function compile(name, schema) {
  return mongoose.models[name] || mongoose.model(name, schema);
}

// ---- User ----
const userSchema = new Schema({
  ...uuidId(),
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  profile: { type: String, enum: ['jedi', 'admin', 'user'], default: 'user' },
  default_workspace_id: { type: String, default: null },
  active: { type: Boolean, default: true },
}, timestamps);

userSchema.pre('save', async function () {
  if (this.isModified('password_hash')) {
    const salt = await bcrypt.genSalt(10);
    this.password_hash = await bcrypt.hash(this.password_hash, salt);
  }
});

userSchema.methods.checkPassword = function (password) {
  return bcrypt.compare(password, this.password_hash);
};

export const User = compile('User', userSchema);

// ---- Workspace ----
const workspaceSchema = new Schema({
  ...uuidId(),
  name: { type: String, required: true },
  schema_name: { type: String, required: true, unique: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  billing_cycle_start_day: { type: Number, default: 1 },
  logo: { type: String, default: null },
}, timestamps);

export const Workspace = compile('Workspace', workspaceSchema);

// ---- Role ----
const roleSchema = new Schema({
  ...uuidId(),
  name: { type: String, required: true, unique: true },
  description: { type: String, default: null },
}, timestamps);

export const Role = compile('Role', roleSchema);

// ---- UserWorkspace (join collection) ----
const userWorkspaceSchema = new Schema({
  ...uuidId(),
  user_id: { type: String, required: true },
  workspace_id: { type: String, required: true },
}, timestamps);
userWorkspaceSchema.index({ user_id: 1, workspace_id: 1 }, { unique: true });

export const UserWorkspace = compile('UserWorkspace', userWorkspaceSchema);

// ---- UserConfig ----
const userConfigSchema = new Schema({
  ...uuidId(),
  user_id: { type: String, required: true, unique: true },
  theme_mode: { type: String, enum: ['light', 'dark'], default: 'light' },
  language: { type: String, default: 'pt-BR' },
  last_login: { type: Date, default: null },
  last_workspace_id: { type: String, default: null },
  menu_behavior: { type: String, enum: ['always_open', 'hover', 'collapsible'], default: 'collapsible' },
}, timestamps);

export const UserConfig = compile('UserConfig', userConfigSchema);

// ---- UserSecurity ----
const userSecuritySchema = new Schema({
  ...uuidId(),
  user_id: { type: String, required: true, unique: true },
  two_factor_enabled: { type: Boolean, default: false },
}, timestamps);

export const UserSecurity = compile('UserSecurity', userSecuritySchema);

// ---- Collaborator ----
const collaboratorSchema = new Schema({
  ...uuidId(),
  name: { type: String, required: true },
  external_id: { type: String, default: null },
  email: { type: String, default: null },
  department: { type: String, default: null },
  workspace_id: { type: String, required: true },
}, timestamps);
collaboratorSchema.index({ workspace_id: 1 });
collaboratorSchema.index({ external_id: 1 });

export const Collaborator = compile('Collaborator', collaboratorSchema);

// ---- CostCenter ----
const costCenterSchema = new Schema({
  ...uuidId(),
  code: { type: String, default: null },
  name: { type: String, required: true },
  description: { type: String, default: null },
  phones: { type: [String], default: [] },
  workspace_id: { type: String, required: true },
}, timestamps);

export const CostCenter = compile('CostCenter', costCenterSchema);

// ---- PhoneLine ----
const phoneLineSchema = new Schema({
  ...uuidId(),
  phone_number: { type: String, required: true },
  responsible_name: { type: String, default: null },
  responsible_id: { type: String, default: null },
  collaborator_id: { type: String, default: null },
  cost_center_id: { type: String, default: null },
  workspace_id: { type: String, required: true },
}, timestamps);
phoneLineSchema.index({ workspace_id: 1 });
phoneLineSchema.index({ cost_center_id: 1 });
phoneLineSchema.index({ phone_number: 1 });
phoneLineSchema.index({ collaborator_id: 1 });

export const PhoneLine = compile('PhoneLine', phoneLineSchema);

// ---- RawInvoice ----
const rawInvoiceSchema = new Schema({
  ...uuidId(),
  workspace_id: { type: String, required: true },
  operator: { type: String, enum: ['claro', 'vivo', 'claro_txt'], required: true },
  content: { type: Schema.Types.Mixed, required: true },
  due_date: { type: String, default: null },
  hash: { type: String, required: true },
  processing_status: { type: String, enum: ['pendente', 'processado', 'erro'], default: 'pendente' },
}, timestamps);
rawInvoiceSchema.index({ workspace_id: 1, operator: 1, hash: 1 }, { unique: true });

export const RawInvoice = compile('RawInvoice', rawInvoiceSchema);

// ---- Invoice ----
const invoiceSchema = new Schema({
  ...uuidId(),
  workspace_id: { type: String, required: true },
  operator: { type: String, required: true },
  source_phone: { type: String, default: null },
  destination_phone: { type: String, default: null },
  item_date: { type: String, default: null },
  item_time: { type: String, default: null },
  description: { type: String, default: null },
  duration: { type: String, default: null },
  quantity: { type: Number, default: 0 },
  total_value: { type: Number, default: 0 },
  charged_value: { type: Number, default: 0 },
  section: { type: String, default: null },
  sub_section: { type: String, default: null },
  original_cost_center: { type: String, default: null },
  original_user: { type: String, default: null },
  tax_type: { type: String, default: null },
  source_location: { type: String, default: null },
  destination_location: { type: String, default: null },
  item_hash: { type: String, default: null },
  raw_invoice_id: { type: String, default: null },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, timestamps);
invoiceSchema.index({ workspace_id: 1, item_date: 1 });
invoiceSchema.index({ raw_invoice_id: 1 });
invoiceSchema.index({ source_phone: 1 });

export const Invoice = compile('Invoice', invoiceSchema);

// ---- AssociationHistory ----
const associationHistorySchema = new Schema({
  ...uuidId(),
  user_id: { type: String, required: true },
  workspace_id: { type: String, required: true },
  action: { type: String, required: true },
}, timestamps);

export const AssociationHistory = compile('AssociationHistory', associationHistorySchema);

// ---- OperationLog ----
const operationLogSchema = new Schema({
  ...uuidId(),
  user_id: { type: String, default: null },
  workspace_id: { type: String, default: null },
  action: { type: String, required: true },
  entity: { type: String, default: null },
  entity_id: { type: String, default: null },
  ip_address: { type: String, default: null },
  payload: { type: Schema.Types.Mixed, default: null },
}, timestamps);
operationLogSchema.index({ workspace_id: 1, created_at: -1 });

export const OperationLog = compile('OperationLog', operationLogSchema);
