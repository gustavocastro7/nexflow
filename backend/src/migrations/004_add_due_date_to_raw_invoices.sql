-- Add due_date column to raw_invoices table
ALTER TABLE public.raw_invoices ADD COLUMN IF NOT EXISTS due_date date;

-- Index for better performance when filtering reports
CREATE INDEX IF NOT EXISTS raw_invoices_due_date_idx ON public.raw_invoices (due_date);
