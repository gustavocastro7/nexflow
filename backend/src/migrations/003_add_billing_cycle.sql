-- Add billing_cycle_start_day to workspaces
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS billing_cycle_start_day INTEGER DEFAULT 1;
