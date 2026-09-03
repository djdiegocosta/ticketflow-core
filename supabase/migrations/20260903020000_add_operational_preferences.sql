ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS pending_sale_expiration_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS temperature_aquecendo_sales_per_day integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS temperature_quente_sales_per_day integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS temperature_explodindo_sales_per_day integer NOT NULL DEFAULT 50;

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_pending_sale_expiration_minutes_check,
  DROP CONSTRAINT IF EXISTS organizations_temperature_aquecendo_sales_per_day_check,
  DROP CONSTRAINT IF EXISTS organizations_temperature_quente_sales_per_day_check,
  DROP CONSTRAINT IF EXISTS organizations_temperature_explodindo_sales_per_day_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_pending_sale_expiration_minutes_check CHECK (pending_sale_expiration_minutes BETWEEN 5 AND 1440),
  ADD CONSTRAINT organizations_temperature_aquecendo_sales_per_day_check CHECK (temperature_aquecendo_sales_per_day >= 1),
  ADD CONSTRAINT organizations_temperature_quente_sales_per_day_check CHECK (temperature_quente_sales_per_day > temperature_aquecendo_sales_per_day),
  ADD CONSTRAINT organizations_temperature_explodindo_sales_per_day_check CHECK (temperature_explodindo_sales_per_day > temperature_quente_sales_per_day);
