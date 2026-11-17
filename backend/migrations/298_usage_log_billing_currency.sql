-- Preserve the charged unit and account-cost conversion at settlement time.
-- NULL means an older/unrecorded policy; never relabel historical amounts.
ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS billing_currency VARCHAR(3);
ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS billing_usd_to_cny NUMERIC(18,8);
