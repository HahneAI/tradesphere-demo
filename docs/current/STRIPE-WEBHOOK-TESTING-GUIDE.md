# Stripe Webhook Testing Guide

**Status**: Ready for Testing
**Created**: 2025-10-21
**Handler**: `netlify/functions/stripe-webhook.ts`

---

## Testing Environment Setup

### Prerequisites

1. **Stripe Account**: Test mode enabled
2. **Stripe CLI**: Installed and authenticated
3. **Netlify Dev Server**: Running locally
4. **Environment Variables**: Configured correctly

### Install Stripe CLI

**macOS/Linux**:
```bash
brew install stripe/stripe-cli/stripe
```

**Windows**:
```bash
scoop install stripe
```

**Verify installation**:
```bash
stripe --version
# Should output: stripe version X.X.X
```

### Authenticate Stripe CLI

```bash
stripe login
# Opens browser for authentication
# Select your test mode account
```

---

## Local Testing with Stripe CLI

### 1. Start Netlify Dev Server

```bash
cd c:\Users\antho\Documents\TradesphereProjects\tradesphere-no-code-migration
netlify dev
# Server should start on http://localhost:8888
```

### 2. Forward Webhooks to Local Server

```bash
# In a new terminal window
stripe listen --forward-to localhost:8888/.netlify/functions/stripe-webhook

# You'll see:
# > Ready! Your webhook signing secret is whsec_xxx (^C to quit)
```

**IMPORTANT**: Copy the `whsec_xxx` value and add to `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 3. Trigger Test Events

**Open a third terminal window** and trigger events:

```bash
# Test successful payment
stripe trigger payment_intent.succeeded

# Test failed payment
stripe trigger payment_intent.payment_failed

# Test payment method attached
stripe trigger payment_method.attached

# Test dispute
stripe trigger charge.dispute.created
```

---

## Manual Testing Scenarios

### Scenario 1: Successful Monthly Subscription Payment

**Setup**:
```sql
-- Create test company with Stripe customer
INSERT INTO companies (
  id,
  name,
  email,
  stripe_customer_id,
  stripe_payment_method_id,
  subscription_status,
  payment_method_status,
  next_billing_date,
  monthly_amount
) VALUES (
  gen_random_uuid(),
  'Test Company LLC',
  'test@example.com',
  'cus_test123',
  'pm_test123',
  'active',
  'verified',
  NOW() + INTERVAL '30 days',
  200000  -- $2000 in cents
);

-- Create test payment record
INSERT INTO payments (
  id,
  company_id,
  amount,
  status,
  payment_type,
  stripe_payment_intent_id,
  subscription_period_start,
  subscription_period_end
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM companies WHERE stripe_customer_id = 'cus_test123'),
  200000,
  'processing',
  'monthly_subscription',
  'pi_test123',
  NOW(),
  NOW() + INTERVAL '30 days'
);
```

**Trigger Event**:
```bash
stripe trigger payment_intent.succeeded
```

**Expected Results**:
1. Check `stripe_webhooks` table:
```sql
SELECT
  event_type,
  processed,
  company_id,
  payment_id,
  created_at
FROM stripe_webhooks
ORDER BY created_at DESC
LIMIT 1;

-- Expected: event_type = 'payment_intent.succeeded', processed = true
```

2. Check `payments` table:
```sql
SELECT
  status,
  stripe_charge_id,
  processed_at
FROM payments
WHERE stripe_payment_intent_id = 'pi_test123';

-- Expected: status = 'succeeded', processed_at IS NOT NULL
```

3. Check `companies` table:
```sql
SELECT
  subscription_status,
  next_billing_date,
  payment_failure_count
FROM companies
WHERE stripe_customer_id = 'cus_test123';

-- Expected: subscription_status = 'active', payment_failure_count = 0
-- next_billing_date should be advanced by 30 days
```

---

### Scenario 2: Failed Payment (Insufficient Funds)

**Setup**:
```sql
-- Use same company from Scenario 1
-- Create new payment record
INSERT INTO payments (
  id,
  company_id,
  amount,
  status,
  payment_type,
  stripe_payment_intent_id,
  subscription_period_start,
  subscription_period_end
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM companies WHERE stripe_customer_id = 'cus_test123'),
  200000,
  'processing',
  'monthly_subscription',
  'pi_test_fail123',
  NOW(),
  NOW() + INTERVAL '30 days'
);
```

**Trigger Event**:
```bash
stripe trigger payment_intent.payment_failed
```

**Expected Results**:
1. Check `payments` table:
```sql
SELECT
  status,
  failure_code,
  failure_message
FROM payments
WHERE stripe_payment_intent_id LIKE 'pi_test_fail%';

-- Expected: status = 'failed', failure_code IS NOT NULL
```

2. Check `companies` table:
```sql
SELECT
  payment_failure_count,
  last_payment_failed_at
FROM companies
WHERE stripe_customer_id = 'cus_test123';

-- Expected: payment_failure_count = 1, last_payment_failed_at IS NOT NULL
```

---

### Scenario 3: Bank Account Verification (Plaid)

**Setup**:
```sql
-- Create company without payment method
INSERT INTO companies (
  id,
  name,
  email,
  stripe_customer_id,
  payment_method_status
) VALUES (
  gen_random_uuid(),
  'New Company LLC',
  'new@example.com',
  'cus_new123',
  'pending'
);
```

**Trigger Event**:
```bash
stripe trigger payment_method.attached
```

**Expected Results**:
```sql
SELECT
  payment_method_status,
  stripe_payment_method_id,
  payment_method_verified_at
FROM companies
WHERE stripe_customer_id = 'cus_new123';

-- Expected:
-- payment_method_status = 'verified'
-- stripe_payment_method_id IS NOT NULL
-- payment_method_verified_at IS NOT NULL
```

---

### Scenario 4: ACH Dispute

**Setup**:
```sql
-- Create completed payment
INSERT INTO payments (
  id,
  company_id,
  amount,
  status,
  payment_type,
  stripe_payment_intent_id,
  stripe_charge_id
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM companies WHERE stripe_customer_id = 'cus_test123'),
  200000,
  'succeeded',
  'monthly_subscription',
  'pi_dispute123',
  'ch_dispute123'
);
```

**Trigger Event**:
```bash
stripe trigger charge.dispute.created
```

**Expected Results**:
```sql
SELECT
  status,
  failure_code,
  failure_message
FROM payments
WHERE stripe_charge_id = 'ch_dispute123';

-- Expected: failure_code = 'disputed', failure_message contains 'dispute'
```

---

## Production Webhook Testing

### 1. Deploy to Netlify

```bash
# Commit changes
git add netlify/functions/stripe-webhook.ts
git commit -m "feat: add Stripe webhook handler"
git push origin no-code-migration

# Netlify will auto-deploy
```

### 2. Configure Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click **Add endpoint**
3. Enter URL: `https://full-code.netlify.app/.netlify/functions/stripe-webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.processing`
   - `payment_intent.canceled`
   - `payment_method.attached`
   - `payment_method.detached`
   - `charge.dispute.created`
   - `charge.dispute.closed`
   - `charge.refunded`
5. Click **Add endpoint**
6. Click **Reveal** next to "Signing secret"
7. Copy `whsec_xxx` value
8. Add to Netlify environment variables:
   - Go to Netlify dashboard → Site settings → Environment variables
   - Add `STRIPE_WEBHOOK_SECRET` = `whsec_xxx`
   - Redeploy site

### 3. Test Live Webhook Delivery

**From Stripe Dashboard**:
1. Go to Webhooks → Your endpoint
2. Click **Send test webhook**
3. Select `payment_intent.succeeded`
4. Click **Send test webhook**

**Check Results**:
```sql
-- Query Supabase database
SELECT
  event_type,
  processed,
  error,
  created_at
FROM stripe_webhooks
ORDER BY created_at DESC
LIMIT 10;
```

---

## Debugging Failed Webhooks

### Check Netlify Function Logs

1. Go to Netlify dashboard
2. Click **Functions** tab
3. Click **stripe-webhook**
4. View real-time logs

**Look for**:
- `[Stripe Webhook] Received: payment_intent.succeeded`
- `[Stripe Webhook] Payment succeeded for company: xxx`
- Any error messages

### Check Stripe Dashboard Logs

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your endpoint
3. View **Webhook attempts** section
4. Click on failed attempts to see error details

**Common errors**:
- `401 Unauthorized` - Invalid webhook secret
- `500 Internal Server Error` - Database or processing error
- `Timeout` - Function took too long (>10 seconds)

### Query Unprocessed Webhooks

```sql
SELECT
  id,
  event_type,
  error,
  retry_count,
  payload->>'id' as stripe_event_id,
  created_at
FROM stripe_webhooks
WHERE processed = false
ORDER BY created_at DESC;
```

### Manually Reprocess Failed Webhook

If webhook failed but is logged in database, you can manually reprocess:

```typescript
// Create admin endpoint: netlify/functions/admin-reprocess-webhook.ts
import { createClient } from '@supabase/supabase-js';

export const handler = async (event) => {
  const { webhookId } = JSON.parse(event.body);

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get webhook payload
  const { data: webhook } = await supabase
    .from('stripe_webhooks')
    .select('payload')
    .eq('id', webhookId)
    .single();

  // Re-run processing logic
  await processWebhookEvent(webhook.payload, webhookId);

  return { statusCode: 200, body: 'Reprocessed' };
};
```

---

## Performance Testing

### Test High Volume Webhook Processing

**Simulate 100 webhooks**:
```bash
# Script to trigger multiple webhooks
for i in {1..100}; do
  stripe trigger payment_intent.succeeded &
done
wait
```

**Expected results**:
- All 100 webhooks logged in `stripe_webhooks` table
- All 100 webhooks processed successfully (`processed = true`)
- Processing time < 500ms per webhook
- No duplicate processing (idempotency working)

**Check processing time**:
```sql
SELECT
  event_type,
  COUNT(*) as total,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_seconds
FROM stripe_webhooks
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY event_type;
```

---

## Security Testing

### Test Invalid Signature

**Manually send webhook with bad signature**:
```bash
curl -X POST https://full-code.netlify.app/.netlify/functions/stripe-webhook \
  -H "stripe-signature: invalid" \
  -H "Content-Type: application/json" \
  -d '{"id": "evt_test", "type": "payment_intent.succeeded"}'

# Expected response: 401 Unauthorized
```

### Test Replay Attack

**Send same webhook twice**:
```bash
# First send (should succeed)
stripe trigger payment_intent.succeeded

# Get event ID from logs
# Send again manually with same event ID

# Expected: Second send returns 200 but with "duplicate: true"
```

---

## Monitoring Queries

### Daily Webhook Summary

```sql
SELECT
  DATE(created_at) as date,
  event_type,
  COUNT(*) as total,
  SUM(CASE WHEN processed THEN 1 ELSE 0 END) as processed,
  SUM(CASE WHEN NOT processed THEN 1 ELSE 0 END) as failed
FROM stripe_webhooks
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), event_type
ORDER BY date DESC, total DESC;
```

### Payment Success Rate

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_payments,
  SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  ROUND(
    SUM(CASE WHEN status = 'succeeded' THEN 1.0 ELSE 0.0 END) / COUNT(*) * 100,
    2
  ) as success_rate_percent
FROM payments
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Webhooks Needing Attention

```sql
-- Unprocessed webhooks older than 1 hour
SELECT
  id,
  event_type,
  error,
  retry_count,
  created_at,
  AGE(NOW(), created_at) as age
FROM stripe_webhooks
WHERE processed = false
AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at ASC;
```

---

## Cleanup After Testing

### Remove Test Data

```sql
-- Remove test webhooks
DELETE FROM stripe_webhooks
WHERE event_type LIKE '%test%'
OR payload->>'livemode' = 'false';

-- Remove test payments
DELETE FROM payments
WHERE stripe_payment_intent_id LIKE '%test%';

-- Remove test companies
DELETE FROM companies
WHERE stripe_customer_id LIKE '%test%';
```

---

## Checklist for Production Deployment

- [ ] Stripe webhook handler deployed to Netlify
- [ ] Environment variables configured:
  - [ ] `STRIPE_SECRET_KEY` (live mode)
  - [ ] `STRIPE_WEBHOOK_SECRET` (from Stripe dashboard)
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Webhook endpoint registered in Stripe dashboard (live mode)
- [ ] All required events selected in Stripe dashboard
- [ ] Test webhook sent and processed successfully
- [ ] Database indexes verified: `idx_payments_stripe_payment_intent`, `idx_companies_stripe_customer`
- [ ] Monitoring queries set up for:
  - [ ] Failed webhook detection
  - [ ] Payment success rate
  - [ ] Webhook processing time
- [ ] Alert system configured for:
  - [ ] Unprocessed webhooks older than 1 hour
  - [ ] Payment failure rate > 10%
  - [ ] Webhook processing errors
- [ ] Documentation reviewed:
  - [ ] `STRIPE-WEBHOOK-MIGRATION-GUIDE.md`
  - [ ] `STRIPE-WEBHOOK-TESTING-GUIDE.md`

---

## Support and Troubleshooting

### Common Issues

**Issue**: `Invalid signature` error
- **Solution**: Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- **Check**: Ensure using correct secret (test vs live mode)

**Issue**: `Payment not found` warning in logs
- **Solution**: Ensure payment record created before webhook arrives
- **Check**: Verify `stripe_payment_intent_id` matches exactly

**Issue**: Webhook marked as `processed = false`
- **Solution**: Check `error` column for specific error message
- **Check**: Verify database helper functions exist and have correct permissions

**Issue**: Duplicate webhooks being processed
- **Solution**: Idempotency check should prevent this - verify query works
- **Check**: Ensure `payload->>id` extraction is correct

### Getting Help

1. **Check Netlify function logs** for detailed error messages
2. **Check Stripe dashboard** webhook attempts for delivery status
3. **Query database** for webhook records and error messages
4. **Review documentation** in `STRIPE-WEBHOOK-MIGRATION-GUIDE.md`
5. **Contact support** with specific error messages and event IDs

---

## References

- **Stripe Webhook Handler**: `netlify/functions/stripe-webhook.ts`
- **Migration Guide**: `docs/current/STRIPE-WEBHOOK-MIGRATION-GUIDE.md`
- **Stripe Webhook Docs**: https://stripe.com/docs/webhooks
- **Stripe CLI Docs**: https://stripe.com/docs/stripe-cli
- **Database Migration**: `database/migrations/18-MIGRATE-DWOLLA-TO-STRIPE.sql`
