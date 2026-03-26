-- Migration: Add collaborators table and link to phone_lines

-- 1. Create collaborators table
CREATE TABLE IF NOT EXISTS public.collaborators (
  id uuid NOT NULL,
  name varchar(150) NOT NULL,
  external_id varchar(50) NULL,
  email varchar(150) NULL,
  department varchar(100) NULL,
  workspace_id uuid NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT collaborators_pkey PRIMARY KEY (id),
  CONSTRAINT collaborators_workspace_id_fkey FOREIGN KEY (workspace_id)
    REFERENCES public.workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS collaborators_workspace_id_idx ON public.collaborators (workspace_id);
CREATE INDEX IF NOT EXISTS collaborators_external_id_idx ON public.collaborators (external_id);

-- 2. Add collaborator_id to phone_lines
ALTER TABLE public.phone_lines
  ADD COLUMN IF NOT EXISTS collaborator_id uuid NULL;

ALTER TABLE public.phone_lines
  ADD CONSTRAINT phone_lines_collaborator_id_fkey FOREIGN KEY (collaborator_id)
    REFERENCES public.collaborators(id) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS phone_lines_collaborator_id_idx ON public.phone_lines (collaborator_id);
