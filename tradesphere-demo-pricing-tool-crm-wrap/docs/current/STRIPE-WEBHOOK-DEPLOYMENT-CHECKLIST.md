# Stripe Webhook Deployment Checklist

**Status**: Pre-Deployment
**Target Go-Live**: TBD
**Owner**: Payment Integration Team

---

## Phase 1: Pre-Deployment Verification

### Code Review

- [ ] **Webhook Handler Review**
  - [ ] Review `netlify/functions/stripe-webhook.ts`
  - [ ] Verify all 12 event handlers implemented
  - [ ] Check error handling in each handler
  - [ ] Verify signature verification logic
  - [ ] Confirm idempotency implementation

- [ ] **Type Safety Review**
  - [ ] Review `src/types/stripe-webhook.ts`
  - [ ] Verify all Stripe event types covered
  - [ ] Check enum values match Stripe API
  - [ ] Confirm type guards work correctly

- [ ] **Database Schema Review**
  - [ ] Verify migration 18 executed in production database
  - [ ] Confirm all indexes created
  - [ ] Check database helper functions exist
  - [ ] Verify RLS policies updated

### Documentation Review

- [ ] **Migration Guide**
  - [ ] Read `STRIPE-WEBHOOK-MIGRATION-GUIDE.md`
  - [ ] Understand Dwolla → Stripe differences
  - [ ] Review event mapping table
  - [ ] Understand error handling changes

- [ ] **Testing Guide**
  - [ ] Read `STRIPE-WEBHOOK-TESTING-GUIDE.md`
  - [ ] Understand local testing workflow
  - [ ] Review production testing scenarios
  - [ ] Plan QA test cases

- [ ] **Implementation Summary**
  - [ ] Read `STRIPE-WEBHOOK-IMPLEMENTATION-SUMMARY.md`
  - [ ] Understand architecture decisions
  - [ ] Review security considerations
  - [ ] Understand performance characteristics

---

## Phase 2: Environment Setup

### Development Environment

- [ ] **Stripe Test Mode**
  - [ ] Create Stripe test mode account (or use existing)
  - [ ] Generate test API keys
  - [ ] Save test secret key: `sk_test_xxx`

- [ ] **Local Development**
  - [ ] Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
  - [ ] Authenticate: `stripe login`
  - [ ] Set up `.env.local` file:
    ```env
    VITE_SUPABASE_URL=your-supabase-url
    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
    STRIPE_SECRET_KEY=sk_test_xxx
    STRIPE_WEBHOOK_SECRET=whsec_xxx  # from stripe listen command
    ```

- [ ] **Netlify Dev Server**
  - [ ] Run `netlify dev`
  - [ ] Verify server starts on port 8888
  - [ ] Test webhook endpoint manually

### Production Environment

- [ ] **Stripe Live Mode**
  - [ ] Switch to live mode in Stripe dashboard
  - [ ] Generate live API keys
  - [ ] Save live secret key: `sk_live_xxx`

- [ ] **Netlify Environment Variables**
  - [ ] Go to Netlify dashboard → Site settings → Environment variables
  - [ ] Add/update:
    ```
    STRIPE_SECRET_KEY = sk_live_xxx
    STRIPE_WEBHOOK_SECRET = whsec_xxx (will add after webhook endpoint created)
    VITE_SUPABASE_URL = production-supabase-url
    SUPABASE_SERVICE_ROLE_KEY = production-service-role-key
    ```
  - [ ] Save and redeploy site

---

## Phase 3: Testing

### Unit Tests (Future Enhancement)

- [ ] **Event Handler Tests**
  - [ ] Test `handlePaymentIntentSucceeded()`
  - [ ] Test `handlePaymentIntentFailed()`
  - [ ] Test `handlePaymentMethodAttached()`
  - [ ] Test `handleDisputeCreated()`

- [ ] **Idempotency Tests**
  - [ ] Test duplicate webhook detection
  - [ ] Test already-processed webhook handling

- [ ] **Error Handling Tests**
  - [ ] Test invalid signature rejection
  - [ ] Test database error handling
  - [ ] Test missing payment record handling

### Local Integration Tests

- [ ] **Stripe CLI Testing**
  - [ ] Start webhook forwarding: `stripe listen --forward-to localhost:8888/.netlify/functions/stripe-webhook`
  - [ ] Copy webhook secret to `.env.local`
  - [ ] Trigger test event: `stripe trigger payment_intent.succeeded`
  - [ ] Verify webhook received and processed
  - [ ] Check database for webhook record
  - [ ] Verify `processed = true`

- [ ] **Manual Test Scenarios**
  - [ ] **Scenario 1: Successful Payment**
    - [ ] Create test company with `stripe_customer_id`
    - [ ] Create test payment with `stripe_payment_intent_id`
    - [ ] Trigger `payment_intent.succeeded`
    - [ ] Verify payment status updated to 'succeeded'
    - [ ] Verify `next_billing_date` advanced by 30 days
    - [ ] Verify `payment_failure_count` reset to 0

  - [ ] **Scenario 2: Failed Payment**
    - [ ] Create test payment record
    - [ ] Trigger `payment_intent.payment_failed`
    - [ ] Verify payment status updated to 'failed'
    - [ ] Verify `failure_code` and `failure_message` populated
    - [ ] Verify `payment_failure_count` incremented

  - [ ] **Scenario 3: Bank Account Verification**
    - [ ] Create test company without payment method
    - [ ] Trigger `payment_method.attached`
    - [ ] Verify `payment_method_status` = 'verified'
    - [ ] Verify `stripe_payment_method_id` populated
    - [ ] Verify `payment_method_verified_at` set

  - [ ] **Scenario 4: Dispute Created**
    - [ ] Create test payment with `stripe_charge_id`
    - [ ] Trigger `charge.dispute.created`
    - [ ] Verify `failure_code` = 'disputed'
    - [ ] Verify `failure_message` contains dispute reason

### Staging Environment Tests

- [ ] **Deploy to Staging**
  - [ ] Create staging branch
  - [ ] Deploy to Netlify staging site
  - [ ] Configure staging Stripe webhook endpoint

- [ ] **End-to-End Testing**
  - [ ] Test full onboarding flow with Plaid
  - [ ] Test subscription billing creation
  - [ ] Test webhook processing in staging database
  - [ ] Verify all event handlers work in deployed environment

---

## Phase 4: Production Deployment

### Pre-Deployment

- [ ] **Code Freeze**
  - [ ] Merge all changes to main branch
  - [ ] Tag release: `git tag -a v1.0.0-stripe-webhooks -m "Stripe webhook implementation"`
  - [ ] Push tags: `git push origin --tags`

- [ ] **Database Backup**
  - [ ] Create full Supabase database backup
  - [ ] Download backup locally
  - [ ] Verify backup integrity

- [ ] **Rollback Plan**
  - [ ] Document rollback procedure
  - [ ] Prepare Dwolla fallback (if needed)
  - [ ] Identify rollback decision-maker

### Deployment

- [ ] **Deploy Code**
  - [ ] Merge to main branch
  - [ ] Verify Netlify auto-deployment triggered
  - [ ] Monitor deployment logs for errors
  - [ ] Verify deployment succeeded

- [ ] **Configure Stripe Webhook Endpoint**
  - [ ] Go to Stripe Dashboard (live mode) → Developers → Webhooks
  - [ ] Click **Add endpoint**
  - [ ] Enter URL: `https://full-code.netlify.app/.netlify/functions/stripe-webhook`
  - [ ] Select API version: Latest (or `2024-12-18.acacia`)
  - [ ] Select events to listen to:
    - [ ] `payment_intent.succeeded`
    - [ ] `payment_intent.payment_failed`
    - [ ] `payment_intent.processing`
    - [ ] `payment_intent.canceled`
    - [ ] `payment_method.attached`
    - [ ] `payment_method.detached`
    - [ ] `payment_method.automatically_updated`
    - [ ] `charge.dispute.created`
    - [ ] `charge.dispute.closed`
    - [ ] `charge.refunded`
    - [ ] `customer.updated`
    - [ ] `customer.deleted`
  - [ ] Click **Add endpoint**
  - [ ] Click **Reveal** next to "Signing secret"
  - [ ] Copy `whsec_xxx` value

- [ ] **Update Environment Variables**
  - [ ] Go to Netlify dashboard → Environment variables
  - [ ] Update `STRIPE_WEBHOOK_SECRET` = `whsec_xxx`
  - [ ] Save changes
  - [ ] Trigger manual redeploy

- [ ] **Verify Deployment**
  - [ ] Check Netlify function logs
  - [ ] Verify webhook endpoint accessible
  - [ ] Test with Stripe CLI: `stripe trigger payment_intent.succeeded`
  - [ ] Check production database for webhook record

---

## Phase 5: Post-Deployment Verification

### Immediate Verification (First 15 Minutes)

- [ ] **Webhook Delivery Test**
  - [ ] From Stripe Dashboard, send test webhook
  - [ ] Verify webhook received (check Netlify logs)
  - [ ] Verify webhook processed (check database)
  - [ ] Verify no errors in Stripe Dashboard webhook attempts

- [ ] **Database Verification**
  ```sql
  -- Check latest webhook
  SELECT
    event_type,
    processed,
    error,
    created_at
  FROM stripe_webhooks
  ORDER BY created_at DESC
  LIMIT 5;
  -- Expected: All processed = true, error = null
  ```

- [ ] **Error Monitoring**
  - [ ] Check Netlify function error logs
  - [ ] Check Supabase logs for database errors
  - [ ] Check Stripe Dashboard for failed webhook attempts

### First Hour Monitoring

- [ ] **Monitor Webhook Volume**
  ```sql
  -- Webhook count in last hour
  SELECT COUNT(*) FROM stripe_webhooks
  WHERE created_at > NOW() - INTERVAL '1 hour';
  ```

- [ ] **Monitor Processing Success Rate**
  ```sql
  -- Success rate in last hour
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN processed THEN 1 ELSE 0 END) as processed,
    ROUND(
      SUM(CASE WHEN processed THEN 1.0 ELSE 0.0 END) / COUNT(*) * 100,
      2
    ) as success_rate_percent
  FROM stripe_webhooks
  WHERE created_at > NOW() - INTERVAL '1 hour';
  -- Expected: success_rate_percent >= 95%
  ```

- [ ] **Monitor for Errors**
  ```sql
  -- Failed webhooks in last hour
  SELECT
    id,
    event_type,
    error,
    retry_count,
    created_at
  FROM stripe_webhooks
  WHERE processed = false
  AND created_at > NOW() - INTERVAL '1 hour'
  ORDER BY created_at DESC;
  -- Expected: 0 rows (or investigate immediately if any)
  ```

### First 24 Hours Monitoring

- [ ] **Daily Metrics Check**
  - [ ] Total webhooks received (by event type)
  - [ ] Processing success rate (should be >95%)
  - [ ] Payment success rate (baseline for comparison)
  - [ ] Average webhook processing time (<500ms expected)

- [ ] **Payment Flow Verification**
  - [ ] Verify at least one successful subscription payment
  - [ ] Verify payment status updated correctly
  - [ ] Verify billing date advanced correctly
  - [ ] Verify company subscription status updated

- [ ] **Error Investigation**
  - [ ] Review all failed webhooks
  - [ ] Identify root causes
  - [ ] Fix issues or create bug tickets
  - [ ] Document common errors

---

## Phase 6: Monitoring and Alerts

### Set Up Alerts

- [ ] **Critical Alerts** (immediate notification)
  - [ ] Unprocessed webhooks older than 1 hour
  - [ ] Webhook processing error rate > 5%
  - [ ] Payment failure rate > 20% (unusual spike)
  - [ ] Dispute created (requires manual action)

- [ ] **Warning Alerts** (next business day review)
  - [ ] Payment failure rate > 10%
  - [ ] Webhook processing time > 1 second
  - [ ] Retry count > 3 for any webhook

- [ ] **Info Alerts** (weekly review)
  - [ ] Weekly webhook volume summary
  - [ ] Weekly payment success rate
  - [ ] Weekly dispute summary

### Set Up Dashboards

- [ ] **Webhook Dashboard**
  - [ ] Total webhooks received (real-time)
  - [ ] Processing success rate (real-time)
  - [ ] Event type distribution (chart)
  - [ ] Failed webhooks list (table)

- [ ] **Payment Dashboard**
  - [ ] Payment success vs failure rate (chart)
  - [ ] Monthly revenue (chart)
  - [ ] Failed payment reasons (breakdown)
  - [ ] Dispute count and status (table)

---

## Phase 7: Documentation and Training

### Update Documentation

- [ ] **API Documentation**
  - [ ] Document webhook endpoint URL
  - [ ] Document required environment variables
  - [ ] Document event types handled
  - [ ] Document error responses

- [ ] **Runbook**
  - [ ] Create incident response procedures
  - [ ] Document common errors and fixes
  - [ ] Document manual webhook replay process
  - [ ] Document rollback procedure

- [ ] **Support Documentation**
  - [ ] Create customer-facing payment failure messages
  - [ ] Document bank account verification process
  - [ ] Document dispute process
  - [ ] Create FAQ for billing issues

### Team Training

- [ ] **Development Team**
  - [ ] Review webhook implementation
  - [ ] Review monitoring dashboards
  - [ ] Practice incident response
  - [ ] Review rollback procedures

- [ ] **Support Team**
  - [ ] Train on common webhook errors
  - [ ] Train on payment failure reasons
  - [ ] Train on bank account verification
  - [ ] Train on dispute handling

- [ ] **Product Team**
  - [ ] Review new payment flow
  - [ ] Understand Plaid integration
  - [ ] Review error messaging
  - [ ] Plan future enhancements

---

## Phase 8: Cleanup and Optimization

### Code Cleanup

- [ ] **Remove Dwolla Code** (after 30 days of stable Stripe operation)
  - [ ] Archive `netlify/functions/dwolla-webhook.ts`
  - [ ] Remove Dwolla service files
  - [ ] Remove Dwolla types from `src/types/payment.ts`
  - [ ] Remove Dwolla environment variables

- [ ] **Update References**
  - [ ] Update all documentation references
  - [ ] Update code comments
  - [ ] Update API documentation

### Performance Optimization

- [ ] **Database Performance**
  - [ ] Monitor index usage
  - [ ] Optimize slow queries
  - [ ] Add missing indexes if needed

- [ ] **Webhook Processing**
  - [ ] Review processing time metrics
  - [ ] Optimize slow event handlers
  - [ ] Consider caching if needed

### Future Enhancements

- [ ] **Email Notifications**
  - [ ] Implement payment success emails
  - [ ] Implement payment failure emails
  - [ ] Implement dispute notification emails

- [ ] **Admin Panel**
  - [ ] Build webhook replay UI
  - [ ] Build webhook monitoring dashboard
  - [ ] Build payment management UI

- [ ] **Advanced Features**
  - [ ] Implement payment retry logic
  - [ ] Implement dunning management
  - [ ] Implement revenue recognition tracking

---

## Rollback Plan

### If Critical Issues Occur

**Decision Criteria** (rollback if ANY):
- Webhook processing error rate > 50% for 1 hour
- Payment processing completely broken
- Database corruption detected
- Security vulnerability discovered

**Rollback Steps**:

1. **Stop Incoming Webhooks**
   - [ ] Disable webhook endpoint in Stripe Dashboard
   - [ ] This stops new webhooks from being sent

2. **Revert Code Deployment**
   - [ ] Revert Netlify deployment to previous version
   - [ ] Verify old code is running

3. **Database Rollback** (if needed)
   - [ ] Restore from backup taken before migration
   - [ ] Re-run migration 18 rollback steps (see migration file)

4. **Re-enable Dwolla** (if needed)
   - [ ] Restore Dwolla environment variables
   - [ ] Re-enable Dwolla webhook endpoint
   - [ ] Verify Dwolla webhooks processing

5. **Incident Post-Mortem**
   - [ ] Document what went wrong
   - [ ] Identify root cause
   - [ ] Create fix plan
   - [ ] Schedule retry deployment

---

## Success Metrics

### Week 1 Success Criteria

- [ ] **Uptime**: 99.9% webhook processing success rate
- [ ] **Performance**: Average processing time < 500ms
- [ ] **Accuracy**: 100% of payments correctly processed
- [ ] **Errors**: < 5% webhook processing errors
- [ ] **No rollback needed**

### Month 1 Success Criteria

- [ ] **Payment Success Rate**: >= 90% (industry standard)
- [ ] **Dispute Rate**: < 1% (industry standard)
- [ ] **Webhook Processing**: 99% success rate
- [ ] **No customer complaints** about billing errors
- [ ] **No data corruption** incidents

---

## Sign-Off

### Pre-Deployment Sign-Off

- [ ] **Engineering Lead**: Code review approved
- [ ] **Product Manager**: Feature requirements met
- [ ] **QA Lead**: Testing complete
- [ ] **DevOps Lead**: Infrastructure ready

### Post-Deployment Sign-Off

- [ ] **Engineering Lead**: Monitoring confirms success
- [ ] **Product Manager**: No customer issues reported
- [ ] **Support Lead**: Team trained and ready
- [ ] **Stakeholder**: Go-live approved

---

## Contact Information

### Incident Response Team

**On-Call Engineer**: TBD
- Email: TBD
- Phone: TBD
- Slack: TBD

**Engineering Lead**: TBD
- Email: TBD
- Phone: TBD

**Product Manager**: TBD
- Email: TBD

**Stripe Support**: https://support.stripe.com/

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-21 | 1.0 | Initial checklist created | Payment Integration Team |
| | | | |
| | | | |

---

**Status**: ⏳ Ready for Deployment
**Next Step**: Begin Phase 1 - Pre-Deployment Verification
