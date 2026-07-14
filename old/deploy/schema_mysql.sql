-- ============================================
-- Nexflow - Schema MySQL para phpMyAdmin
-- Execute toda de uma vez no banco de dados
-- ============================================

CREATE TABLE IF NOT EXISTS workspaces (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  schema_name VARCHAR(255) NOT NULL UNIQUE,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  billing_cycle_start_day INT NOT NULL DEFAULT 1,
  logo TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  profile ENUM('jedi', 'admin', 'user') NOT NULL DEFAULT 'user',
  default_workspace_id CHAR(36) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_configs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  theme_mode ENUM('light', 'dark') DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'pt-BR',
  last_login DATETIME NULL,
  last_workspace_id CHAR(36) NULL,
  menu_behavior ENUM('always_open', 'hover', 'collapsible') DEFAULT 'collapsible',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (last_workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_securities (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  two_factor_enabled TINYINT(1) DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_workspaces (
  user_id CHAR(36) NOT NULL,
  workspace_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, workspace_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS roles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cost_centers (
  id CHAR(36) NOT NULL PRIMARY KEY,
  code VARCHAR(50) NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  phones JSON DEFAULT ('[]'),
  workspace_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS collaborators (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  external_id VARCHAR(50) NULL,
  email VARCHAR(150) NULL,
  department VARCHAR(100) NULL,
  workspace_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_collaborators_workspace (workspace_id),
  INDEX idx_collaborators_external_id (external_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS phone_lines (
  id CHAR(36) NOT NULL PRIMARY KEY,
  phone_number VARCHAR(25) NOT NULL,
  responsible_name VARCHAR(150) NULL,
  responsible_id VARCHAR(50) NULL,
  collaborator_id CHAR(36) NULL,
  cost_center_id CHAR(36) NULL,
  workspace_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (collaborator_id) REFERENCES collaborators(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_phone_lines_workspace (workspace_id),
  INDEX idx_phone_lines_cost_center (cost_center_id),
  INDEX idx_phone_lines_phone_number (phone_number),
  INDEX idx_phone_lines_collaborator (collaborator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS raw_invoices (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  operator ENUM('claro', 'vivo', 'claro_txt') NOT NULL,
  content JSON NOT NULL,
  due_date DATE NULL,
  hash VARCHAR(255) NOT NULL,
  processing_status ENUM('pendente', 'processado', 'erro') DEFAULT 'pendente',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX idx_raw_invoices_unique (workspace_id, operator, hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invoices (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  operator VARCHAR(20) NOT NULL,
  source_phone VARCHAR(25) NULL,
  destination_phone VARCHAR(25) NULL,
  item_date DATE NULL,
  item_time TIME NULL,
  description VARCHAR(255) NULL,
  duration VARCHAR(30) NULL,
  quantity DECIMAL(15, 4) NULL,
  total_value DECIMAL(12, 2) NULL,
  charged_value DECIMAL(12, 2) NULL,
  section VARCHAR(100) NULL,
  sub_section VARCHAR(100) NULL,
  original_cost_center VARCHAR(100) NULL,
  original_user VARCHAR(100) NULL,
  tax_type VARCHAR(50) NULL,
  source_location VARCHAR(100) NULL,
  destination_location VARCHAR(100) NULL,
  item_hash VARCHAR(64) NULL,
  raw_invoice_id CHAR(36) NULL,
  metadata JSON DEFAULT ('{}'),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (raw_invoice_id) REFERENCES raw_invoices(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS association_history (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  workspace_id CHAR(36) NOT NULL,
  action VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS operation_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  workspace_id CHAR(36) NOT NULL,
  action VARCHAR(255) NOT NULL,
  entity VARCHAR(255) NULL,
  entity_id CHAR(36) NULL,
  ip_address VARCHAR(255) NULL,
  payload JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Seed - Dados iniciais
-- ============================================

-- Workspace padrao
INSERT INTO workspaces (id, name, schema_name, status) VALUES
  (UUID(), 'Nexflow Matriz', 'nexflow_matriz', 'active');

-- Admin padrao (senha: castro - hash bcrypt)
INSERT INTO users (id, name, email, password_hash, profile, default_workspace_id, active) VALUES
  (UUID(), 'Jedi Master', 'gustavocastro73@gmail.com', '$2a$10$8KzQMG5jZGqG4qJxJpGX7e8e8e8e8e8e8e8e8e8e8e8e8e8e8e', 'jedi', (SELECT id FROM workspaces WHERE schema_name = 'nexflow_matriz'), 1);

-- Vincular admin ao workspace
INSERT INTO user_workspaces (user_id, workspace_id)
  SELECT u.id, w.id FROM users u, workspaces w
  WHERE u.email = 'gustavocastro73@gmail.com' AND w.schema_name = 'nexflow_matriz';

-- Config do admin
INSERT INTO user_configs (id, user_id, language)
  SELECT UUID(), u.id, 'pt-BR' FROM users u WHERE u.email = 'gustavocastro73@gmail.com';

-- Centros de custo padrao
INSERT INTO cost_centers (id, name, description, workspace_id)
  SELECT UUID(), 'Diretoria', 'Centro de custo da diretoria', w.id FROM workspaces w WHERE w.schema_name = 'nexflow_matriz'
  UNION ALL
  SELECT UUID(), 'TI', 'Centro de custo de infraestrutura e TI', w.id FROM workspaces w WHERE w.schema_name = 'nexflow_matriz'
  UNION ALL
  SELECT UUID(), 'Financeiro', 'Centro de custo do financeiro', w.id FROM workspaces w WHERE w.schema_name = 'nexflow_matriz';

-- Segundo usuario (Fabio)
INSERT INTO users (id, name, email, password_hash, profile, default_workspace_id, active) VALUES
  (UUID(), 'Fabio Luckmann', 'fabioluckmann79@gmail.com', '$2a$10$8KzQMG5jZGqG4qJxJpGX7e8e8e8e8e8e8e8e8e8e8e8e8e8e8e', 'jedi', (SELECT id FROM workspaces WHERE schema_name = 'nexflow_matriz'), 1);

INSERT INTO user_workspaces (user_id, workspace_id)
  SELECT u.id, w.id FROM users u, workspaces w
  WHERE u.email = 'fabioluckmann79@gmail.com' AND w.schema_name = 'nexflow_matriz';

INSERT INTO user_configs (id, user_id, language)
  SELECT UUID(), u.id, 'pt-BR' FROM users u WHERE u.email = 'fabioluckmann79@gmail.com';
