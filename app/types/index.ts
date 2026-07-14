export interface User {
  id: string;
  name: string;
  email: string;
  profile: 'user' | 'admin' | 'jedi';
  active?: boolean | null;
  default_workspace_id?: string;
  config?: {
    theme_mode?: 'light' | 'dark';
    language?: string;
    last_workspace_id?: string;
    last_login?: string;
  };
}

export interface Workspace {
  id: string;
  name: string;
  schema_name: string;
  status?: string;
  billing_cycle_start_day?: number;
  logo?: string | null;
}

export interface CostCenter {
  id: string;
  code?: string;
  name: string;
  description?: string;
  phones: string[];
}

export interface PhoneLine {
  id: string;
  phone_number: string;
  responsible_name?: string;
  responsible_id?: string;
  cost_center_id?: string;
  workspace_id: string;
}

export interface Invoice {
  id: string;
  workspace_id: string;
  operator: string;
  source_phone?: string;
  destination_phone?: string;
  item_date?: string;
  item_time?: string;
  description?: string;
  duration?: string;
  quantity?: number;
  total_value?: number;
  charged_value?: number;
  section?: string;
  sub_section?: string;
  original_cost_center?: string;
  original_user?: string;
  raw_invoice_id?: string;
  metadata?: any;
}

export interface RawInvoice {
  id: string;
  operator: string;
  content: {
    raw?: string;
    header?: {
      data_vencimento?: string;
      valor_total?: string;
      cliente?: string;
    }
  };
  created_at: string;
}

export interface InvalidItem {
  line: number;
  content: string;
  errors: string[];
}

export interface ImportPreview {
  total: number;
  validCount: number;
  invalidCount: number;
  invalidItems: InvalidItem[];
  phonesDiscovered: string[];
  header?: {
    data_vencimento?: string;
    valor_total?: string;
    cliente?: string;
  };
  preview: Invoice[];
}

export interface Collaborator {
  id: string;
  name: string;
  external_id: string;
  email: string;
  department: string;
  workspace_id: string;
}

export interface CSVImportPreview {
  total: number;
  validCount: number;
  invalidCount: number;
  toCreate: number;
  toUpdate: number;
  costCentersFound: number;
  costCentersToCreate: number;
  costCentersToCreateNames: string[];
  invalidRows: { row: number; errors: string[] }[];
}

export interface CSVImportResult {
  collaboratorsCreated: number;
  collaboratorsUpdated: number;
  costCentersCreated: number;
  costCentersCreatedNames: string[];
  phoneLinesCreated: number;
  phoneLinesUpdated: number;
  skipped: number;
}

export interface AuditLog {
  id: string;
  user_id: string;
  workspace_id: string;
  action: string;
  entity: string;
  entity_id: string;
  ip_address: string;
  payload: any;
  created_at?: string;
  createdAt?: string;
  user?: {
    name: string;
    email: string;
  };
}

export interface PhoneLineRow {
  id: string;
  costCenterCode: string;
  costCenterName: string;
  phoneNumber: string;
  responsibleName: string;
  responsibleId: string;
}

export interface ConsumptionCCRow {
  costCenterCode: string;
  costCenterName: string;
  dueDate: string;
  total: number;
}

export interface ConsumptionRespRow {
  responsibleName: string;
  responsibleId: string;
  phoneNumber: string;
  costCenterCode: string;
  costCenterName: string;
  total: number;
}

export interface DataConsumptionRow {
  phoneNumber: string;
  responsibleName: string;
  costCenterCode: string;
  costCenterName: string;
  totalDataMb: number;
}

export interface LineDetailRow {
  [key: string]: any;
  id: string;
  item_date: string;
  item_time: string;
  description: string;
  destination_phone: string;
  duration: string;
  quantity: number;
  total_value: number;
  charged_value: number;
  section: string;
  sub_section: string;
}

export interface PageResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  grandTotal?: number;
}
