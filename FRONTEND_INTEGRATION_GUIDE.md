# Frontend Payment Integration Guide

## 🎯 Quick Answer: What Endpoints to Integrate?

**For most cases, you DON'T need to call any additional endpoints!** The payment link is already included in all invoice responses.

## ✅ Option 1: Simple Approach (Recommended)

### Step 1: Get Invoice (Already includes payment_link)
When you fetch any invoice, the response now includes `payment_link`:

```javascript
// GET /api/invoices/:id
// GET /api/users/:id/invoices
// GET /api/user/my-invoices

Response:
{
  "success": true,
  "data": {
    "_id": "...",
    "invoice_id": "INV-001",
    "status": "pending",
    "amount": 100.00,
    "payment_link": "https://checkout.stripe.com/pay/cs_test_...",  // ✅ Already here!
    // ... other fields
  }
}
```

### Step 2: Check if payment_link exists and redirect user
```javascript
// In your frontend component
const handlePayInvoice = (invoice) => {
  if (invoice.payment_link) {
    // Redirect user to Stripe Checkout
    window.location.href = invoice.payment_link;
  } else if (invoice.status === 'pending' && invoice.amount > 0) {
    // Payment link not yet generated, create one first
    createPaymentSession(invoice._id);
  }
};
```

### Step 3: If payment_link is null, create it (Optional)
Only if `payment_link` is `null` for a pending invoice:

```javascript
// POST /api/client/invoices/:invoiceId/payment/create-session
// OR
// POST /api/admin/invoices/:invoiceId/payment/create-session

const createPaymentSession = async (invoiceId) => {
  try {
    const response = await fetch(
      `/api/client/invoices/${invoiceId}/payment/create-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Include auth token
        }
      }
    );
    
    const data = await response.json();
    
    if (data.success && data.data.checkout_url) {
      // Redirect to Stripe Checkout
      window.location.href = data.data.checkout_url;
    }
  } catch (error) {
    console.error('Error creating payment session:', error);
  }
};
```

---

## 🔧 Option 2: Full Control Approach

If you want more control over the payment flow, use these dedicated endpoints:

### 1. Create Payment Session
```javascript
POST /api/client/invoices/:invoiceId/payment/create-session
// OR for admin
POST /api/admin/invoices/:invoiceId/payment/create-session

Headers:
{
  "Authorization": "Bearer <token>"
}

Response:
{
  "success": true,
  "message": "Payment session created successfully",
  "data": {
    "checkout_url": "https://checkout.stripe.com/pay/cs_test_...",
    "session_id": "cs_test_...",
    "invoice_id": "INV-001",
    "amount": 100.00,
    "expires_at": "2024-01-15T12:00:00.000Z"
  }
}
```

### 2. Get Payment Link
```javascript
GET /api/client/invoices/:invoiceId/payment/link
// OR for admin
GET /api/admin/invoices/:invoiceId/payment/link

Headers:
{
  "Authorization": "Bearer <token>"
}

Response:
{
  "success": true,
  "message": "Payment session found",
  "data": {
    "checkout_url": "https://checkout.stripe.com/pay/cs_test_...",
    "session_id": "cs_test_...",
    "invoice_id": "INV-001",
    "amount": 100.00,
    "expires_at": "2024-01-15T12:00:00.000Z"
  }
}
```

### 3. Check Payment Status (After redirect from Stripe)
```javascript
GET /api/client/invoices/:invoiceId/payment/status
// OR for admin
GET /api/admin/invoices/:invoiceId/payment/status

Headers:
{
  "Authorization": "Bearer <token>"
}

Response:
{
  "success": true,
  "data": {
    "invoice_id": "INV-001",
    "status": "paid",  // or "pending", "overdue"
    "amount": 100.00,
    "stripe_payment_status": "succeeded",
    "paid_at": "2024-01-15T10:30:00.000Z",
    "payment_details": {
      "session_id": "cs_test_...",
      "payment_status": "paid",
      "amount_total": 100.00,
      "currency": "usd"
    }
  }
}
```

---

## 📋 Complete Frontend Flow

### Recommended Implementation:

```javascript
// 1. Fetch invoice (includes payment_link automatically)
const fetchInvoice = async (invoiceId) => {
  const response = await fetch(`/api/invoices/${invoiceId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { data } = await response.json();
  return data;
};

// 2. Handle Payment Button Click
const handlePayment = async (invoice) => {
  // Option A: Use existing payment_link if available
  if (invoice.payment_link) {
    window.location.href = invoice.payment_link;
    return;
  }
  
  // Option B: Create new session if link doesn't exist
  if (invoice.status === 'pending' && invoice.amount > 0) {
    try {
      const response = await fetch(
        `/api/client/invoices/${invoice._id}/payment/create-session`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const result = await response.json();
      
      if (result.success && result.data.checkout_url) {
        window.location.href = result.data.checkout_url;
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Failed to create payment session');
    }
  }
};

// 3. After Stripe redirects back (Success Page)
const checkPaymentStatus = async (invoiceId) => {
  const response = await fetch(
    `/api/client/invoices/${invoiceId}/payment/status`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const { data } = await response.json();
  
  if (data.status === 'paid') {
    // Show success message
    console.log('Payment successful!');
  }
};
```

---

## 🎨 UI Examples

### Example: Invoice List Component

```jsx
const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    const response = await fetch('/api/user/my-invoices', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const { data } = await response.json();
    setInvoices(data.invoices);
  };

  const handlePay = async (invoice) => {
    if (invoice.payment_link) {
      window.location.href = invoice.payment_link;
    } else {
      // Create session and redirect
      await createPaymentSession(invoice._id);
    }
  };

  return (
    <div>
      {invoices.map(invoice => (
        <div key={invoice._id}>
          <h3>{invoice.invoice_id}</h3>
          <p>Amount: ${invoice.amount}</p>
          <p>Status: {invoice.status}</p>
          
          {invoice.status === 'pending' && invoice.amount > 0 && (
            <button onClick={() => handlePay(invoice)}>
              Pay Now
            </button>
          )}
          
          {invoice.status === 'paid' && (
            <span>✅ Paid</span>
          )}
        </div>
      ))}
    </div>
  );
};
```

### Example: Single Invoice Detail Page

```jsx
const InvoiceDetail = ({ invoiceId }) => {
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    fetchInvoice(invoiceId);
  }, [invoiceId]);

  const fetchInvoice = async () => {
    const response = await fetch(`/api/invoices/${invoiceId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const { data } = await response.json();
    setInvoice(data);
  };

  const handlePay = () => {
    if (invoice.payment_link) {
      window.location.href = invoice.payment_link;
    }
  };

  if (!invoice) return <div>Loading...</div>;

  return (
    <div>
      <h1>Invoice {invoice.invoice_id}</h1>
      <p>Amount: ${invoice.amount}</p>
      <p>Status: {invoice.status}</p>
      <p>Due Date: {invoice.due_date}</p>
      
      {invoice.status === 'pending' && (
        <button onClick={handlePay}>
          {invoice.payment_link ? 'Pay Now' : 'Generate Payment Link'}
        </button>
      )}
    </div>
  );
};
```

---

## 🔐 Authentication

**All payment endpoints require authentication:**
- Client endpoints: Use `protect` middleware (regular user token)
- Admin endpoints: Use `authorize('admin', 'moderator')` middleware (admin token)

**Include token in headers:**
```javascript
headers: {
  'Authorization': `Bearer ${yourAuthToken}`,
  'Content-Type': 'application/json'
}
```

---

## 📝 Summary

### Minimum Integration (Recommended):
1. ✅ Fetch invoice (payment_link is already included)
2. ✅ Check if `payment_link` exists
3. ✅ If exists → redirect to `payment_link`
4. ✅ If null → call `POST /api/client/invoices/:invoiceId/payment/create-session`

### Endpoints Available:
- **Client Side**: `/api/client/invoices/:invoiceId/payment/*`
- **Admin Side**: `/api/admin/invoices/:invoiceId/payment/*`

### What Happens After Payment:
1. Stripe redirects user to success URL: `${CLIENT_URL}/invoices/${invoiceId}/payment/success`
2. Webhook automatically updates invoice status to "paid"
3. You can check status with: `GET /api/client/invoices/:invoiceId/payment/status`

---

## 🚀 Quick Start Code

```javascript
// Minimal payment integration
const payInvoice = async (invoiceId) => {
  // 1. Get invoice (includes payment_link)
  const invoice = await fetch(`/api/invoices/${invoiceId}`).then(r => r.json());
  
  // 2. Use payment_link if available
  if (invoice.data.payment_link) {
    window.location.href = invoice.data.payment_link;
  } else {
    // 3. Create session if needed
    const session = await fetch(
      `/api/client/invoices/${invoiceId}/payment/create-session`,
      { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }
    ).then(r => r.json());
    
    if (session.data.checkout_url) {
      window.location.href = session.data.checkout_url;
    }
  }
};
```

That's it! 🎉




