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
}

export interface CostCenter {
  id: string;
  name: string;
  description?: string;
  phones: string[];
}

export interface Invoice {
  id: string;
  workspace_id: string;
  carrier: string;
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
