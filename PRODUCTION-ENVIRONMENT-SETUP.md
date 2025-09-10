# Production Environment Setup Guide

## 🚨 Make.com Webhook Troubleshooting

Based on your screenshot showing the Make.com webhook failing, this guide will help you identify and fix the issue.

## Problem Diagnosis

The issue appears to be that Make.com is not successfully completing its webhook call to your Netlify function. Here's how to diagnose and fix it:

## 1. Environment Variables Setup

### Required Variables in Netlify Dashboard

In your Netlify site settings → Environment variables, ensure you have **BOTH** sets:

#### For Client-Side (VITE_ prefixed)
```bash
VITE_SUPABASE_URL=https://acdudelebwrzewxqmwnc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjZHVkZWxlYndyemV3eHFtd25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NzUxNTcsImV4cCI6MjA2NTQ1MTE1N30.HnxT5Z9EcIi4otNryHobsQCN6x5M43T0hvKMF6Pxx_c
VITE_ENABLE_DUAL_TESTING=true
VITE_MAKE_WEBHOOK_URL=your_make_webhook_url
```

#### For Netlify Functions (non-VITE prefixed) ⚠️ CRITICAL
```bash
SUPABASE_URL=https://acdudelebwrzewxqmwnc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjZHVkZWxlYndyemV3eHFtd25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NzUxNTcsImV4cCI6MjA2NTQ1MTE1N30.HnxT5Z9EcIi4otNryHobsQCN6x5M43T0hvKMF6Pxx_c
```

**Why both are needed:** Netlify Functions cannot access VITE_ prefixed environment variables.

## 2. Make.com Configuration

### Current Issue Symptoms
- Native code works (appears in yellow/gold border)
- Make.com response missing (should appear in green border)
- Dual testing shows only one response

### Make.com Scenario Setup

1. **Webhook URL**: Use this exact format
   ```
   https://your-netlify-site.netlify.app/.netlify/functions/chat-response
   ```

2. **HTTP Method**: POST

3. **Headers**:
   ```json
   {
     "Content-Type": "application/json"
   }
   ```

4. **Body Structure** (JSON):
   ```json
   {
     "response": "{{ your_ai_response_variable }}",
     "sessionId": "{{ session_id_from_trigger }}",
     "timestamp": "{{ now }}",
     "techId": "{{ tech_id_optional }}"
   }
   ```

## 3. Testing & Debugging

### Step 1: Test Webhook Connectivity

Visit this URL to test your webhook:
```
https://your-netlify-site.netlify.app/.netlify/functions/webhook-test
```

This will show you:
- If your Netlify functions are working
- Environment variable status
- Proper webhook format

### Step 2: Test Make.com Webhook

Use curl to simulate Make.com:
```bash
curl -X POST https://your-netlify-site.netlify.app/.netlify/functions/chat-response \
  -H "Content-Type: application/json" \
  -d '{
    "response": "Test response from Make.com",
    "sessionId": "test_session_123",
    "timestamp": "2025-01-09T12:00:00Z"
  }'
```

Expected response:
```json
{
  "message": "AI response received and stored",
  "success": true,
  "requestId": "webhook_...",
  "processingTime": 150
}
```

### Step 3: Check Netlify Function Logs

1. Go to Netlify Dashboard → Functions
2. Click on `chat-response` function
3. Check the logs for entries starting with `🚨`

Look for:
- `WEBHOOK RECEIVED` - Confirms Make.com is calling
- `JSON parsed successfully` - Confirms proper format
- `Database storage completed` - Confirms storage works
- Any error messages

## 4. Common Issues & Solutions

### Issue 1: Make.com Not Calling Webhook
**Symptoms**: No logs in Netlify function logs
**Solutions**:
- Verify webhook URL in Make.com scenario
- Check Make.com scenario is active and running
- Ensure no HTTP module errors in Make.com

### Issue 2: Webhook Called But Data Missing
**Symptoms**: Logs show webhook calls but missing sessionId/response
**Solutions**:
- Check Make.com variable mapping
- Ensure sessionId is passed from your chat trigger
- Verify AI response is properly formatted

### Issue 3: Database Storage Failing
**Symptoms**: `Storage failed` errors in logs
**Solutions**:
- Verify both SUPABASE_URL and SUPABASE_ANON_KEY are set in Netlify
- Check Supabase table permissions
- Verify demo_messages table exists

### Issue 4: Response Not Appearing in UI
**Symptoms**: Webhook succeeds but no green border message
**Solutions**:
- Verify `VITE_ENABLE_DUAL_TESTING=true`
- Check `message_source` field is set to `make_com`
- Verify chat-messages function is polling correctly

## 5. Verification Checklist

- [ ] Both VITE_ and non-VITE_ environment variables set in Netlify
- [ ] Make.com scenario webhook URL points to correct Netlify function
- [ ] Webhook test endpoint returns success
- [ ] Manual curl test works
- [ ] Netlify function logs show successful webhook calls
- [ ] Dual testing mode enabled
- [ ] Supabase database accessible

## 6. Debug Commands

### Local Development
```bash
# Test environment loading
npm run test:env

# Test with dotenv
npm run test:conversation

# Manual webhook simulation
curl -X POST http://localhost:8888/.netlify/functions/chat-response \
  -H "Content-Type: application/json" \
  -d '{"response": "test", "sessionId": "local_test"}'
```

### Production Debugging
```bash
# Check if functions are deployed
curl https://your-site.netlify.app/.netlify/functions/webhook-test

# Test actual webhook endpoint
curl -X POST https://your-site.netlify.app/.netlify/functions/chat-response \
  -H "Content-Type: application/json" \
  -d '{"response": "production test", "sessionId": "prod_test_123"}'
```

## 7. Expected Behavior

When working correctly:
1. User sends message
2. Native pricing agent responds immediately (yellow/gold border)
3. Make.com scenario triggers
4. Make.com calls Netlify webhook function
5. Response stored in database with `message_source: 'make_com'`
6. Chat interface polls and shows Make.com response (green border)
7. Performance comparison shows both response times

## 8. Next Steps

1. **Immediate**: Add the missing non-VITE_ environment variables to Netlify
2. **Testing**: Use the webhook-test endpoint to verify connectivity
3. **Monitoring**: Watch Netlify function logs during Make.com execution
4. **Validation**: Confirm both responses appear with proper borders

The enhanced debugging in `chat-response.js` will now provide detailed logs to help identify exactly where the Make.com webhook chain is breaking.