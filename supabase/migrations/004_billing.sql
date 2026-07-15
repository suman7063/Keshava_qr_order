-- ============================================================
-- Migration 004: Razorpay billing lifecycle
-- Widens subscription status to match Razorpay's subscription
-- states and links a restaurant to its active subscription.
-- ============================================================

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('created', 'authenticated', 'active', 'past_due', 'halted', 'cancelled', 'completed'));

-- Fast lookup by the provider's subscription id (webhook handling)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_subscriptions_provider_sub
  ON subscriptions(provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;
