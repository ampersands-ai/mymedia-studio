BEGIN;

-- Deduct 960 tokens from exploiter's account
UPDATE user_subscriptions
SET 
  tokens_remaining = tokens_remaining - 960,
  tokens_total = tokens_total - 960,
  updated_at = NOW()
WHERE user_id = '8d5d86b4-a0d2-4aad-8fc8-b348d72502c1';

-- Log the enforcement action
INSERT INTO audit_logs (user_id, action, resource_type, metadata)
VALUES (
  '8d5d86b4-a0d2-4aad-8fc8-b348d72502c1',
  'fraud_recovery_token_deduction',
  'user_subscription',
  jsonb_build_object(
    'reason', 'double_refund_exploitation',
    'tokens_deducted', 960,
    'affected_generations', ARRAY[
      'f2a7d2b2-0ffc-4555-8abc-f4b5e19b5e06',
      'e9ec171c-34f1-44d0-86bb-a48e2ed72f40', 
      '2467733a-b8fe-4a9b-ab23-4368a3e4a0cd'
    ],
    'duplicate_refunds', 3,
    'user_email', 'ppoli@duck.com',
    'enforcement_date', NOW()
  )
);

COMMIT;