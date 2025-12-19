# Stripe Production Setup (Test Mode)

This guide explains how to configure Stripe in **test mode** for your production environment.

## 📋 Prerequisites

1. Stripe account (free account is fine)
2. Production server URL (e.g., `https://your-domain.com`)
3. Access to production environment variables

---

## 🔧 Step 1: Get Stripe Test Keys

1. Go to [Stripe Dashboard - Test Mode API Keys](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Secret key** (starts with `sk_test_...`)
3. Keep this page open for webhook setup later

---

## 🔧 Step 2: Configure Environment Variables

Add these environment variables to your **production server**:

```env
# Stripe Configuration (Test Mode)
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY_HERE

# Frontend URL (Your production frontend URL)
CLIENT_URL=https://your-frontend-domain.com
# OR use FRONTEND_URL (both work):
# FRONTEND_URL=https://your-frontend-domain.com

# Webhook Secret (Get from Step 3)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

**Important Notes:**
- ✅ Use **test keys** (starts with `sk_test_...`)
- ✅ Use your **production frontend URL** for `CLIENT_URL`
- ✅ Make sure URL doesn't have trailing slash

---

## 🔧 Step 3: Set Up Webhook Endpoint

You have **two options** for webhooks:

### Option A: Stripe Dashboard Webhook (Recommended for Production)

1. Go to [Stripe Dashboard - Webhooks (Test Mode)](https://dashboard.stripe.com/test/webhooks)
2. Click **"Add endpoint"**
3. Enter your webhook URL:
   ```
   https://your-backend-domain.com/api/webhooks/stripe
   ```
4. Select events to listen for:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
5. Click **"Add endpoint"**
6. **Copy the "Signing secret"** (starts with `whsec_...`)
7. Add it to your production environment variables as `STRIPE_WEBHOOK_SECRET`

### Option B: Stripe CLI (For Testing Only)

If you want to test webhooks on production while developing:

```bash
# Forward webhooks from Stripe to your production URL
stripe listen --forward-to https://your-backend-domain.com/api/webhooks/stripe
```

**Important:** 
- Stripe CLI gives you a temporary webhook secret
- This is only for testing/development
- For real production, use Option A (Dashboard webhook)

---

## ✅ Step 4: Verify Configuration

### Check Environment Variables

Ensure these are set in production:
- ✅ `STRIPE_SECRET_KEY` = Test key (`sk_test_...`)
- ✅ `CLIENT_URL` = Production frontend URL
- ✅ `STRIPE_WEBHOOK_SECRET` = Webhook signing secret

### Test Payment Flow

1. Create an invoice in your admin panel
2. Generate payment link
3. Click payment link → Should redirect to Stripe Checkout (test mode)
4. Use Stripe test card: `4242 4242 4242 4242`
5. Complete payment → Should redirect back to your production frontend URL

---

## 🎯 Current Configuration

Your code already supports this setup:

### Redirect URLs (Already Configured ✅)

The redirect URLs are automatically built using `CLIENT_URL`:

```javascript
// In paymentController.js and invoiceController.js
let baseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
baseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slash

success_url: `${baseUrl}/invoices/${invoice._id}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
cancel_url: `${baseUrl}/invoices/${invoice._id}/payment/cancel`,
```

**What this means:**
- If `CLIENT_URL` is set to `https://your-frontend.com`, redirects will go there
- If not set, defaults to `http://localhost:3000` (for development)

### Webhook Endpoint (Already Configured ✅)

Your webhook endpoint is at:
```
POST /api/webhooks/stripe
```

It:
- ✅ Accepts raw body (required for signature verification)
- ✅ Verifies webhook signature using `STRIPE_WEBHOOK_SECRET`
- ✅ Handles all payment events
- ✅ Updates invoices and creates payment records

---

## 🔍 How to Check Current Settings

### 1. Check What URL Will Be Used

When you create a payment session, check server logs:
```
Creating Stripe session with baseUrl: https://your-frontend.com
```

### 2. Test Webhook Reception

1. Make a test payment
2. Check Stripe Dashboard → Webhooks → View event logs
3. Check your server logs for:
   ```
   ✅ Invoice INV_001 marked as paid via webhook
   🔔 Payment notification sent to user...
   ```

---

## 🚨 Common Issues

### Issue 1: Redirects Still Going to Localhost

**Problem:** `CLIENT_URL` not set in production

**Solution:** 
- Set `CLIENT_URL` in production environment variables
- Restart your server after adding the variable

### Issue 2: Webhook Signature Verification Failed

**Problem:** Wrong webhook secret or webhook not configured

**Solution:**
- Use the webhook secret from Stripe Dashboard (not CLI)
- Ensure webhook endpoint URL is correct in Stripe Dashboard
- Check `STRIPE_WEBHOOK_SECRET` is set correctly

### Issue 3: Payments Not Processing

**Problem:** Using live keys instead of test keys

**Solution:**
- Verify `STRIPE_SECRET_KEY` starts with `sk_test_...` (not `sk_live_...`)
- Make sure you're in **Test Mode** in Stripe Dashboard

---

## 📝 Quick Checklist

Before going live with test mode:

- [ ] Stripe test secret key added to production (`sk_test_...`)
- [ ] `CLIENT_URL` set to production frontend URL
- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] Webhook secret added to production (`whsec_...`)
- [ ] Test payment completed successfully
- [ ] Redirects going to production URL (not localhost)
- [ ] Webhooks being received and processed

---

## 🔄 Switching to Live Mode Later

When ready to accept real payments:

1. Switch to **Live Mode** in Stripe Dashboard
2. Get **live keys** (`sk_live_...`)
3. Update `STRIPE_SECRET_KEY` to live key
4. Create new webhook endpoint in **Live Mode**
5. Update `STRIPE_WEBHOOK_SECRET` with live webhook secret
6. Test with real card (small amount)

---

## 📚 Additional Resources

- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe API Reference](https://stripe.com/docs/api)

