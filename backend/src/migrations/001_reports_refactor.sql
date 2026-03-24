-- Migration: Reports refactor
-- Adds cost_centers.code and creates phone_lines table.

-- 1. Add "code" column to cost_centers
ALTER TABLE public.cost_centers
  ADD COLUMN IF NOT EXISTS code varchar(50) NULL;

-- 2. Create phone_lines table
CREATE TABLE IF NOT EXISTS public.phone_lines (
  id uuid NOT NULL,
  phone_number varchar(25) NOT NULL,
  responsible_name varchar(150) NULL,
  responsible_id varchar(50) NULL,
  cost_center_id uuid NULL,
  workspace_id uuid NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT phone_lines_pkey PRIMARY KEY (id),
  CONSTRAINT phone_lines_cost_center_id_fkey FOREIGN KEY (cost_center_id)
    REFERENCES public.cost_centers(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT phone_lines_workspace_id_fkey FOREIGN KEY (workspace_id)
    REFERENCES public.workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS phone_lines_workspace_id_idx ON public.phone_lines (workspace_id);
CREATE INDEX IF NOT EXISTS phone_lines_cost_center_id_idx ON public.phone_lines (cost_center_id);
CREATE INDEX IF NOT EXISTS phone_lines_phone_number_idx ON public.phone_lines (phone_number);

-- 3. Backfill phone_lines from existing cost_centers.phones JSONB
INSERT INTO public.phone_lines (id, phone_number, cost_center_id, workspace_id, created_at, updated_at)
SELECT
  gen_random_uuid(),
  p.phone,
  cc.id,
  cc.workspace_id,
  NOW(),
  NOW()
FROM public.cost_centers cc,
     jsonb_array_elements_text(COALESCE(cc.phones, '[]'::jsonb)) AS p(phone)
WHERE NOT EXISTS (
  SELECT 1 FROM public.phone_lines pl
  WHERE pl.phone_number = p.phone AND pl.workspace_id = cc.workspace_id
);
