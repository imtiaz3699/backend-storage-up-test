# Stripe Payment Integration Setup Guide

## Overview
This guide explains how to set up Stripe payments for invoices in your StorageUp backend. Every invoice created will automatically get a Stripe payment link, and payments will automatically update the invoice status to "paid".

## Step-by-Step Setup Instructions

### 1. Get Your Stripe API Keys

1. **Sign up/Login to Stripe:**
   - Go to https://stripe.com
   - Create an account or login

2. **Get your API Keys:**
   - Go to: https://dashboard.stripe.com/apikeys
   - Copy your **Publishable Key** (starts with `pk_`)
   - Copy your **Secret Key** (starts with `sk_`)
   - **For testing:** Use "Test mode" keys (toggle in top right)
   - **For production:** Use "Live mode" keys

3. **Get your Webhook Secret (Choose ONE method):**

   **Method A: Local Testing (Recommended for Development)**
   - In Stripe Dashboard → Workbench → Webhooks, click "Test with a local listener"
   - Install Stripe CLI: https://stripe.com/docs/stripe-cli
   - Run: `stripe listen --forward-to localhost:5000/api/webhooks/stripe`
   - Copy the webhook secret it gives you (starts with `whsec_`)
   - Keep the terminal running while testing

   **Method B: Production Webhook Endpoint**
   - In Stripe Dashboard → Workbench → Webhooks, click "+ Add destination"
   - Select "Webhook endpoint"
   - Enter your webhook URL: `https://your-domain.com/api/webhooks/stripe`
   - Select events to listen to:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
   - Click "Add endpoint"
   - Copy the **Signing secret** (starts with `whsec_`)

### 2. Add Environment Variables

Add these to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Frontend URL (for payment redirects)
CLIENT_URL=http://localhost:3000
# OR for production:
# CLIENT_URL=https://your-frontend-domain.com
```

### 3. How It Works

#### Automatic Flow:
1. **Invoice Created** → System automatically creates a Stripe Checkout Session
2. **User Clicks "Pay Now"** → Gets redirected to Stripe's secure payment page
3. **User Completes Payment** → Stripe processes the payment
4. **Webhook Received** → Your server automatically updates invoice status to "paid"
5. **User Redirected** → Back to your site with success message

### 4. API Endpoints

#### For Users (Client Side):
- **Get Payment Link:**
  ```
  GET /api/client/invoices/:invoiceId/payment/link
  ```
  Returns the Stripe Checkout URL

- **Create Payment Session:**
  ```
  POST /api/client/invoices/:invoiceId/payment/create-session
  ```
  Creates a new Stripe Checkout Session

- **Check Payment Status:**
  ```
  GET /api/client/invoices/:invoiceId/payment/status
  ```
  Returns current payment status

#### For Admins:
- Same endpoints but under `/api/admin/invoices/:invoiceId/payment/...`

#### Webhook (Called by Stripe):
```
POST /api/webhooks/stripe
```
This is automatically called by Stripe - you don't need to call it manually.

### 5. Testing with Stripe Test Mode

1. Use test API keys (starts with `sk_test_` and `pk_test_`)
2. Use Stripe's test card numbers:
   - Success: `4242 4242 4242 4242`
   - Any future expiry date (e.g., `12/34`)
   - Any 3-digit CVC (e.g., `123`)
   - Any postal code (e.g., `12345`)

3. **For Webhook Testing:**
   - Install Stripe CLI: https://stripe.com/docs/stripe-cli
   - Run: `stripe listen --forward-to localhost:5000/api/webhooks/stripe`
   - Copy the webhook secret it gives you and use it in `.env`

### 6. Testing the Flow

1. **Create an Invoice:**
   ```
   POST /api/admin/invoices
   {
     "customer_id": "...",
     "amount": 100.00,
     "invoice_title": "Test Invoice",
     ...
   }
   ```

2. **Get Payment Link:**
   ```
   GET /api/client/invoices/{invoiceId}/payment/link
   ```
   This returns a `checkout_url` - open it in a browser

3. **Complete Payment:**
   - Use test card: `4242 4242 4242 4242`
   - Complete the payment on Stripe's page

4. **Verify:**
   - Check invoice status: It should be "paid"
   - Check invoice `paid_at` field: Should have timestamp

### 7. Invoice Model Updates

The Invoice model now includes these new fields:
- `stripe_checkout_session_id` - Stripe session ID
- `stripe_payment_intent_id` - Stripe payment intent ID
- `stripe_payment_status` - Payment status (pending, succeeded, failed, canceled)
- `paid_at` - Timestamp when payment was completed

### 8. Important Notes

- ✅ **Automatic:** Every invoice automatically gets a payment link when created
- ✅ **Secure:** Payments happen on Stripe's secure servers
- ✅ **Reliable:** Webhooks ensure invoice status updates even if user closes browser
- ⚠️ **Webhook URL:** Must be publicly accessible (use ngrok for local testing)
- ⚠️ **HTTPS Required:** Webhooks require HTTPS in production

### 9. Production Checklist

- [ ] Switch to Live mode API keys in `.env`
- [ ] Update `CLIENT_URL` to production frontend URL
- [ ] Set up webhook endpoint in Stripe Dashboard
- [ ] Use HTTPS for webhook endpoint
- [ ] Test with real payment (small amount)
- [ ] Monitor webhook logs in Stripe Dashboard

### 10. Troubleshooting

**Issue: Webhook not working**
- Check webhook secret in `.env`
- Verify webhook URL is accessible
- Check Stripe Dashboard → Webhooks → Events for errors

**Issue: Invoice not updating to "paid"**
- Check server logs for webhook errors
- Verify webhook events are enabled in Stripe Dashboard
- Check if invoice has `stripe_checkout_session_id`

**Issue: Payment link not created**
- Verify `STRIPE_SECRET_KEY` is set
- Check invoice has `customer_email`
- Check server logs for errors

## Support

For Stripe-specific issues, check:
- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com

