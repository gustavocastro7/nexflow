-- DROP SCHEMA public; 
 
 CREATE SCHEMA IF NOT EXISTS public AUTHORIZATION pg_database_owner; 
 
 -- DROP TYPE public."enum_raw_invoices_operator"; 
 
 DROP TYPE IF EXISTS public."enum_raw_invoices_operator" CASCADE;
 CREATE TYPE public."enum_raw_invoices_operator" AS ENUM ( 
 	 'claro', 
 	 'vivo', 
 	 'claro_txt'); 
 
 -- DROP TYPE public."enum_raw_invoices_processing_status"; 
 
 DROP TYPE IF EXISTS public."enum_raw_invoices_processing_status" CASCADE;
 CREATE TYPE public."enum_raw_invoices_processing_status" AS ENUM ( 
 	 'pendente', 
 	 'processado', 
 	 'erro'); 
 
 -- DROP TYPE public."enum_association_history_action"; 
 
 DROP TYPE IF EXISTS public."enum_association_history_action" CASCADE;
 CREATE TYPE public."enum_association_history_action" AS ENUM ( 
 	 'associado', 
 	 'removido'); 
 
 -- DROP TYPE public."enum_users_profile"; 
 
 DROP TYPE IF EXISTS public."enum_users_profile" CASCADE;
 CREATE TYPE public."enum_users_profile" AS ENUM ( 
 	 'jedi', 
 	 'admin', 
 	 'user'); 
 
 -- DROP TYPE public."enum_user_configs_theme_mode"; 
 
 DROP TYPE IF EXISTS public."enum_user_configs_theme_mode" CASCADE;
 CREATE TYPE public."enum_user_configs_theme_mode" AS ENUM ( 
 	 'light', 
 	 'dark'); 
 
 -- DROP TYPE public."enum_workspaces_status"; 
 
 DROP TYPE IF EXISTS public."enum_workspaces_status" CASCADE;
 CREATE TYPE public."enum_workspaces_status" AS ENUM ( 
 	 'active', 
 	 'inactive'); 
 
 -- public.raw_invoices definition 
 
 -- Drop table 
 
 -- DROP TABLE raw_invoices; 
 
 DROP TABLE IF EXISTS raw_invoices CASCADE;
 CREATE TABLE raw_invoices ( 
 	 id uuid NOT NULL, 
 	 workspace_id uuid NOT NULL, 
 	 operator public."enum_raw_invoices_operator" NOT NULL, 
 	 content jsonb NOT NULL, 
 	 hash varchar(255) NOT NULL, 
 	 processing_status public."enum_raw_invoices_processing_status" DEFAULT 'pendente'::enum_raw_invoices_processing_status NULL, 
 	 created_at timestamptz NOT NULL, 
 	 updated_at timestamptz NOT NULL, 
 	 CONSTRAINT raw_invoices_pkey PRIMARY KEY (id) 
 ); 
 CREATE UNIQUE INDEX raw_invoices_workspace_id_operator_hash ON public.raw_invoices USING btree (workspace_id, operator, hash); 
 
 
 -- public.association_history definition 
 
 -- Drop table 
 
 -- DROP TABLE association_history; 
 
 DROP TABLE IF EXISTS association_history CASCADE;
 CREATE TABLE association_history ( 
 	 id uuid NOT NULL, 
 	 user_id uuid NOT NULL, 
 	 workspace_id uuid NOT NULL, 
 	 action public."enum_association_history_action" NOT NULL, 
 	 created_at timestamptz NOT NULL, 
 	 updated_at timestamptz NOT NULL, 
 	 CONSTRAINT association_history_pkey PRIMARY KEY (id) 
 ); 
 
 
 -- public.operation_logs definition 
 
 -- Drop table 
 
 -- DROP TABLE operation_logs; 
 
 DROP TABLE IF EXISTS operation_logs CASCADE;
 CREATE TABLE operation_logs ( 
 	 id uuid NOT NULL, 
 	 user_id uuid NOT NULL, 
 	 workspace_id uuid NOT NULL, 
 	 action varchar(255) NOT NULL, 
 	 payload jsonb NULL, 
 	 created_at timestamptz NOT NULL, 
 	 CONSTRAINT operation_logs_pkey PRIMARY KEY (id) 
 ); 
 
 
 -- public.roles definition 
 
 -- Drop table 
 
 -- DROP TABLE roles; 
 
 DROP TABLE IF EXISTS roles CASCADE;
 CREATE TABLE roles ( 
 	 id uuid NOT NULL, 
 	 "name" varchar(255) NOT NULL, 
 	 created_at timestamptz NOT NULL, 
 	 updated_at timestamptz NOT NULL, 
 	 CONSTRAINT roles_name_key UNIQUE (name), 
 	 CONSTRAINT roles_pkey PRIMARY KEY (id) 
 ); 
 
 
 -- public.users definition 
 
 -- Drop table 
 
 -- DROP TABLE users; 
 
 DROP TABLE IF EXISTS users CASCADE;
 CREATE TABLE users ( 
 	 id uuid NOT NULL, 
 	 "name" varchar(255) NOT NULL, 
 	 email varchar(255) NOT NULL, 
 	 password_hash varchar(255) NOT NULL, 
 	 profile public."enum_users_profile" DEFAULT 'user'::enum_users_profile NOT NULL, 
 	 default_workspace_id uuid NULL, 
 	 active bool DEFAULT true NOT NULL, 
 	 created_at timestamptz NOT NULL, 
 	 updated_at timestamptz NOT NULL, 
 	 CONSTRAINT users_email_key UNIQUE (email), 
 	 CONSTRAINT users_pkey PRIMARY KEY (id) 
 ); 
 
 
 -- public.workspaces definition 
 
 -- Drop table 
 
 -- DROP TABLE workspaces; 
 
 DROP TABLE IF EXISTS workspaces CASCADE;
 CREATE TABLE workspaces ( 
 	 id uuid NOT NULL, 
 	 "name" varchar(255) NOT NULL, 
 	 schema_name varchar(255) NOT NULL, 
 	 status public."enum_workspaces_status" DEFAULT 'active'::enum_workspaces_status NOT NULL, 
 	 created_at timestamptz NOT NULL, 
 	 updated_at timestamptz NOT NULL, 
 	 CONSTRAINT workspaces_pkey PRIMARY KEY (id), 
 	 CONSTRAINT workspaces_schema_name_key UNIQUE (schema_name) 
 ); 
 
 
 -- public.cost_centers definition 
 
 -- Drop table 
 
 -- DROP TABLE cost_centers; 
 
 DROP TABLE IF EXISTS cost_centers CASCADE;
 CREATE TABLE cost_centers ( 
 	 id uuid NOT NULL, 
 	 code varchar(50) NULL,
 	 "name" varchar(255) NOT NULL, 
 	 description text NULL, 
 	 phones jsonb DEFAULT '[]'::jsonb NULL, 
 	 workspace_id uuid NOT NULL, 
 	 created_at timestamptz NOT NULL, 
 	 updated_at timestamptz NOT NULL, 
 	 CONSTRAINT cost_centers_pkey PRIMARY KEY (id), 
 	 CONSTRAINT cost_centers_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE 
 ); 
 
 
 -- public.invoices definition 
 
 -- Drop table 
 
 -- DROP TABLE invoices; 
 
 DROP TABLE IF EXISTS invoices CASCADE;
 CREATE TABLE invoices ( 
 	 id uuid NOT NULL, 
 	 workspace_id uuid NOT NULL, 
 	 operator varchar(20) NOT NULL, 
 	 source_phone varchar(25) NULL, 
 	 destination_phone varchar(25) NULL, 
 	 item_date date NULL, 
 	 item_time time NULL, 
 	 description varchar(255) NULL, 
 	 duration varchar(30) NULL, 
 	 quantity numeric(15, 4) NULL, 
 	 total_value numeric(12, 2) NULL, 
 	 charged_value numeric(12, 2) NULL, 
 	 section varchar(100) NULL, 
 	 sub_section varchar(100) NULL, 
 	 original_cost_center varchar(100) NULL, 
 	 original_user varchar(100) NULL, 
 	 tax_type varchar(50) NULL, 
 	 source_location varchar(100) NULL, 
 	 destination_location varchar(100) NULL, 
 	 item_hash varchar(64) NULL, 
 	 raw_invoice_id uuid NULL, 
 	 metadata jsonb DEFAULT '{}'::jsonb NULL, 
 	 created_at timestamptz NOT NULL, 
 	 updated_at timestamptz NOT NULL, 
 	 CONSTRAINT invoices_pkey PRIMARY KEY (id), 
 	 CONSTRAINT invoices_raw_invoice_id_fkey FOREIGN KEY (raw_invoice_id) REFERENCES raw_invoices(id) ON DELETE CASCADE ON UPDATE CASCADE 
 ); 
 
 
 -- public.user_configs definition 
 
 -- Drop table 
 
 -- DROP TABLE user_configs; 
 
 DROP TABLE IF EXISTS user_configs CASCADE;
 CREATE TABLE user_configs ( 
 	 id uuid NOT NULL, 
 	 user_id uuid NOT NULL, 
 	 last_login timestamptz NULL, 
 	 last_workspace_id uuid NULL, 
 	 theme_mode public."enum_user_configs_theme_mode" DEFAULT 'light'::enum_user_configs_theme_mode NULL, 
 	 "language" varchar(10) DEFAULT 'pt-BR'::character varying NULL, 
 	 created_at timestamptz NOT NULL, 
 	 updated_at timestamptz NOT NULL, 
 	 CONSTRAINT user_configs_pkey PRIMARY KEY (id), 
 	 CONSTRAINT user_configs_user_id_key UNIQUE (user_id), 
 	 CONSTRAINT user_configs_last_workspace_id_fkey FOREIGN KEY (last_workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL ON UPDATE CASCADE, 
 	 CONSTRAINT user_configs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE 
 ); 
 
 
 -- public.user_workspaces definition 
 
 -- Drop table 
 
 -- DROP TABLE user_workspaces; 
 
 DROP TABLE IF EXISTS user_workspaces CASCADE;
 CREATE TABLE user_workspaces ( 
 	 user_id uuid NOT NULL, 
 	 workspace_id uuid NOT NULL, 
 	 created_at timestamptz NOT NULL, 
 	 updated_at timestamptz NOT NULL, 
 	 CONSTRAINT user_workspaces_pkey PRIMARY KEY (user_id, workspace_id), 
 	 CONSTRAINT user_workspaces_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE, 
 	 CONSTRAINT user_workspaces_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE 
 );

 -- public.collaborators definition 
 
 DROP TABLE IF EXISTS collaborators CASCADE;
 CREATE TABLE collaborators ( 
 	 id uuid NOT NULL, 
 	 "name" varchar(150) NOT NULL, 
 	 external_id varchar(50) NULL, 
 	 email varchar(150) NULL, 
 	 department varchar(100) NULL, 
 	 workspace_id uuid NOT NULL, 
 	 created_at timestamptz NOT NULL, 
 	 updated_at timestamptz NOT NULL, 
 	 CONSTRAINT collaborators_pkey PRIMARY KEY (id), 
 	 CONSTRAINT collaborators_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE 
 );
 CREATE INDEX IF NOT EXISTS collaborators_workspace_id_idx ON public.collaborators (workspace_id);
 CREATE INDEX IF NOT EXISTS collaborators_external_id_idx ON public.collaborators (external_id);

 -- public.phone_lines definition 
 
 DROP TABLE IF EXISTS phone_lines CASCADE;
 CREATE TABLE phone_lines ( 
 	 id uuid NOT NULL, 
 	 phone_number varchar(25) NOT NULL, 
 	 responsible_name varchar(150) NULL, 
 	 responsible_id varchar(50) NULL, 
 	 collaborator_id uuid NULL,
 	 cost_center_id uuid NULL, 
 	 workspace_id uuid NOT NULL, 
 	 created_at timestamptz NOT NULL, 
 	 updated_at timestamptz NOT NULL, 
 	 CONSTRAINT phone_lines_pkey PRIMARY KEY (id), 
 	 CONSTRAINT phone_lines_collaborator_id_fkey FOREIGN KEY (collaborator_id) REFERENCES collaborators(id) ON DELETE SET NULL ON UPDATE CASCADE,
 	 CONSTRAINT phone_lines_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE SET NULL ON UPDATE CASCADE, 
 	 CONSTRAINT phone_lines_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE 
 );
 CREATE INDEX IF NOT EXISTS phone_lines_workspace_id_idx ON public.phone_lines (workspace_id);
 CREATE INDEX IF NOT EXISTS phone_lines_cost_center_id_idx ON public.phone_lines (cost_center_id);
 CREATE INDEX IF NOT EXISTS phone_lines_phone_number_idx ON public.phone_lines (phone_number);
 CREATE INDEX IF NOT EXISTS phone_lines_collaborator_id_idx ON public.phone_lines (collaborator_id);

