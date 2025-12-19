# Stripe Production Setup Checklist (Test Mode)

## ✅ Current Configuration Status

Your Stripe integration is **already properly configured** to use environment variables. Here's what you need to do:

---

## 🔧 Required Environment Variables

Set these in your **production environment**:

```env
# Stripe Test Mode Keys
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY_HERE

# Your Production Frontend URL (REQUIRED - This fixes localhost redirect issue)
CLIENT_URL=https://your-frontend-domain.com
# OR use FRONTEND_URL (both work):
# FRONTEND_URL=https://your-frontend-domain.com

# Webhook Secret (from Stripe Dashboard or CLI)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

---

## 🔍 How Redirect URLs Work (Already Configured ✅)

Your code automatically uses `CLIENT_URL` for redirects:

```javascript
// In paymentController.js (line 89) and invoiceController.js (line 831)
let baseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
baseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slash

success_url: `${baseUrl}/invoices/${invoice._id}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
cancel_url: `${baseUrl}/invoices/${invoice._id}/payment/cancel`,
```

**This means:**
- ✅ If `CLIENT_URL` is set → Uses that URL
- ✅ If not set → Defaults to `http://localhost:3000` (development fallback)

---

## 📝 Step-by-Step Setup

### 1. Get Stripe Test Keys

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy **Secret key** (starts with `sk_test_...`)
3. Add to production env: `STRIPE_SECRET_KEY=sk_test_...`

### 2. Set Production Frontend URL

**This fixes the localhost redirect issue!**

Set in production environment:
```env
CLIENT_URL=https://your-actual-frontend-domain.com
```

**Important:** 
- Use `https://` (not `http://`)
- No trailing slash
- Example: `CLIENT_URL=https://myapp.com` ✅
- NOT: `CLIENT_URL=https://myapp.com/` ❌

### 3. Configure Webhooks

#### Option A: Stripe Dashboard (Recommended for Production)

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**
3. Endpoint URL: `https://your-backend-domain.com/api/webhooks/stripe`
4. Select events:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_...`)
6. Add to production env: `STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE`

#### Option B: Stripe CLI (For Testing)

If you want to test with CLI on production:
```bash
stripe listen --forward-to https://your-backend-domain.com/api/webhooks/stripe
```

Then use the CLI-generated secret (temporary, for testing only)

---

## 🧪 Testing

After setup, verify:

1. **Check Logs** - When creating payment session, you should see:
   ```
   🔵 Creating Stripe checkout session for invoice INV_001
   💳 Stripe initialized in TEST MODE (sk_test_51...)
   Using baseUrl: https://your-frontend-domain.com
   Success URL will be: https://your-frontend-domain.com/invoices/.../payment/success
   ```

2. **Test Payment Flow:**
   - Create invoice
   - Generate payment link
   - Click link → Should go to Stripe Checkout
   - Use test card: `4242 4242 4242 4242`, any future expiry, any CVC
   - Complete payment → Should redirect to your production frontend URL (NOT localhost)

3. **Check Webhooks:**
   - Go to Stripe Dashboard → Webhooks → Event logs
   - Should see successful webhook deliveries
   - Check your server logs for: `✅ Invoice marked as paid via webhook`

---

## 🔍 Debugging

### Issue: Still redirecting to localhost?

**Check:**
1. Is `CLIENT_URL` set in production environment?
2. Did you restart the server after adding the variable?
3. Check server logs - it should show: `Using baseUrl: https://your-domain.com`

### Issue: Webhook not working?

**Check:**
1. Is `STRIPE_WEBHOOK_SECRET` set correctly?
2. Is webhook endpoint URL correct in Stripe Dashboard?
3. Is your backend URL accessible from internet?
4. Check server logs for webhook errors

### Issue: Using wrong Stripe mode?

**Check:**
1. Server logs show: `💳 Stripe initialized in TEST MODE` or `LIVE MODE`
2. Ensure `STRIPE_SECRET_KEY` starts with `sk_test_...` for test mode

---

## 📋 Quick Checklist

Before testing on production:

- [ ] `STRIPE_SECRET_KEY` set (test key: `sk_test_...`)
- [ ] `CLIENT_URL` set to production frontend URL
- [ ] `STRIPE_WEBHOOK_SECRET` set (from Dashboard or CLI)
- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] Server restarted after env changes
- [ ] Test payment completed successfully
- [ ] Redirects going to production URL (check logs)
- [ ] Webhooks being received (check Stripe Dashboard)

---

## 🎯 Summary

**The code is already correct!** You just need to:

1. ✅ Set `CLIENT_URL` to your production frontend URL (fixes localhost redirect)
2. ✅ Use Stripe test keys (`sk_test_...`)
3. ✅ Set up webhook endpoint in Stripe Dashboard
4. ✅ Add webhook secret to environment

That's it! No code changes needed.

