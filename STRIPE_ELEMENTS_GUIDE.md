# Stripe Elements Integration Guide

## ⚠️ Important: Why Not Normal Input Fields?

**You CANNOT collect credit card details through regular HTML input fields** because:
- **PCI Compliance**: Handling raw card data requires strict security certifications (PCI DSS Level 1)
- **Security Risk**: Card numbers would travel through your server, exposing you to liability
- **Legal Issues**: Storing raw card data without proper security can lead to legal problems

## ✅ Solution: Stripe Elements

**Stripe Elements** is Stripe's secure frontend library that:
- Handles card input securely
- Never sends card details to your server
- Creates a secure `payment_method_id` token
- Meets PCI compliance automatically
- Works seamlessly with your existing backend

---

## Frontend Implementation

### Step 1: Install Stripe.js

```bash
npm install @stripe/stripe-js
# or
yarn add @stripe/stripe-js
```

### Step 2: Get Your Stripe Publishable Key

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Publishable key** (starts with `pk_test_...` for test mode or `pk_live_...` for live mode)
3. Store it in your frontend `.env` file:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

### Step 3: Create a Payment Method Form Component

Here's a complete React example:

```jsx
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Main component
function AddPaymentMethodForm() {
  return (
    <Elements stripe={stripePromise}>
      <PaymentMethodForm />
    </Elements>
  );
}

// Form component
function PaymentMethodForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [cardHolderName, setCardHolderName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create PaymentMethod from card element
      const cardElement = elements.getElement(CardElement);
      
      const { error: createError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: cardHolderName || undefined,
        },
      });

      if (createError) {
        setError(createError.message);
        setLoading(false);
        return;
      }

      // 2. Send payment_method_id to your backend
      const response = await fetch('http://localhost:5000/api/client/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Include your auth token (cookie or Authorization header)
        },
        credentials: 'include', // Important: for cookies
        body: JSON.stringify({
          payment_method_id: paymentMethod.id, // This is the secure token!
          card_holder_name: cardHolderName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add payment method');
      }

      setSuccess(true);
      setCardHolderName('');
      // Reset card element
      cardElement.clear();
      
      // Optionally reload payment methods list
      console.log('Payment method added:', data.data);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Card Element styling
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  if (success) {
    return (
      <div className="success-message">
        <h3>✅ Payment method added successfully!</h3>
        <button onClick={() => setSuccess(false)}>Add Another Card</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="payment-method-form">
      <h2>Add Payment Method</h2>
      
      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="cardHolderName">Cardholder Name</label>
        <input
          id="cardHolderName"
          type="text"
          value={cardHolderName}
          onChange={(e) => setCardHolderName(e.target.value)}
          placeholder="John Doe"
          className="form-control"
        />
      </div>

      <div className="form-group">
        <label htmlFor="cardElement">Card Details</label>
        <div className="card-element-container" style={{ 
          padding: '12px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          backgroundColor: 'white'
        }}>
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || loading}
        className="submit-button"
        style={{
          padding: '12px 24px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          width: '100%',
          marginTop: '1rem'
        }}
      >
        {loading ? 'Processing...' : 'Add Payment Method'}
      </button>
    </form>
  );
}

export default AddPaymentMethodForm;
```

### Step 4: Install Stripe React Components

```bash
npm install @stripe/react-stripe-js
# or
yarn add @stripe/react-stripe-js
```

---

## Vue.js Example

If you're using Vue.js instead of React:

```vue
<template>
  <div class="payment-form">
    <form @submit.prevent="handleSubmit">
      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="success" class="success">Payment method added successfully!</div>

      <div class="form-group">
        <label>Cardholder Name</label>
        <input v-model="cardHolderName" type="text" placeholder="John Doe" />
      </div>

      <div class="form-group">
        <label>Card Details</label>
        <div ref="cardElement" id="card-element"></div>
      </div>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Processing...' : 'Add Payment Method' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
const cardElement = ref(null);
const card = ref(null);
const loading = ref(false);
const error = ref(null);
const success = ref(false);
const cardHolderName = ref('');

onMounted(async () => {
  const stripe = await stripePromise;
  const elements = stripe.elements();
  
  card.value = elements.create('card', {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
      },
    },
  });
  
  card.value.mount(cardElement.value);
});

onUnmounted(() => {
  if (card.value) {
    card.value.destroy();
  }
});

const handleSubmit = async () => {
  loading.value = true;
  error.value = null;

  try {
    const stripe = await stripePromise;
    const { error: createError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: card.value,
      billing_details: {
        name: cardHolderName.value || undefined,
      },
    });

    if (createError) {
      error.value = createError.message;
      loading.value = false;
      return;
    }

    const response = await fetch('http://localhost:5000/api/client/payment-methods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        payment_method_id: paymentMethod.id,
        card_holder_name: cardHolderName.value,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to add payment method');
    }

    success.value = true;
    card.value.clear();
    cardHolderName.value = '';
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};
</script>
```

---

## Vanilla JavaScript Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>Add Payment Method</title>
  <script src="https://js.stripe.com/v3/"></script>
</head>
<body>
  <form id="payment-form">
    <div id="error-message"></div>
    
    <label>
      Cardholder Name
      <input type="text" id="cardholder-name" placeholder="John Doe" />
    </label>

    <label>
      Card Details
      <div id="card-element"></div>
    </label>

    <button type="submit" id="submit-button">Add Payment Method</button>
  </form>

  <script>
    const stripe = Stripe('pk_test_your_publishable_key_here');
    const elements = stripe.elements();

    const cardElement = elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#424770',
        },
      },
    });

    cardElement.mount('#card-element');

    const form = document.getElementById('payment-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitButton = document.getElementById('submit-button');
      submitButton.disabled = true;
      submitButton.textContent = 'Processing...';

      const cardholderName = document.getElementById('cardholder-name').value;

      try {
        // Create PaymentMethod
        const { error: createError, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: {
            name: cardholderName || undefined,
          },
        });

        if (createError) {
          document.getElementById('error-message').textContent = createError.message;
          submitButton.disabled = false;
          submitButton.textContent = 'Add Payment Method';
          return;
        }

        // Send to backend
        const response = await fetch('http://localhost:5000/api/client/payment-methods', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            payment_method_id: paymentMethod.id,
            card_holder_name: cardholderName,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to add payment method');
        }

        alert('Payment method added successfully!');
        cardElement.clear();
        document.getElementById('cardholder-name').value = '';
      } catch (err) {
        document.getElementById('error-message').textContent = err.message;
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Add Payment Method';
      }
    });
  </script>
</body>
</html>
```

---

## Backend API Endpoint

Your backend already supports this! Use:

**Endpoint:** `POST /api/client/payment-methods`

**Headers:**
```
Content-Type: application/json
Cookie: token=your_jwt_token (or Authorization: Bearer your_jwt_token)
```

**Request Body:**
```json
{
  "payment_method_id": "pm_1234567890abcdef",
  "card_holder_name": "John Doe" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment method added successfully",
  "data": {
    "_id": "...",
    "user": "...",
    "stripe_payment_method_id": "pm_1234567890abcdef",
    "card_brand": "visa",
    "card_last4": "4242",
    "card_exp_month": 12,
    "card_exp_year": 2025,
    "card_holder_name": "John Doe",
    "is_default": true,
    "is_active": true,
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

---

## Key Points

1. **Never send raw card data** (card number, CVV, expiration) to your backend
2. **Always use Stripe Elements** on the frontend to securely collect card details
3. **Send only `payment_method_id`** to your backend - this is a secure token
4. **Your backend already handles it** - the `addPaymentMethod` endpoint accepts `payment_method_id`
5. **PCI Compliant** - Stripe handles all PCI requirements

---

## Testing with Stripe Test Cards

Use these test card numbers in test mode:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure Required**: `4000 0027 6000 3184`

Use any future expiration date, any 3-digit CVC, and any ZIP code.

---

## Additional Resources

- [Stripe Elements Documentation](https://stripe.com/docs/stripe-js)
- [React Stripe.js Documentation](https://stripe.com/docs/stripe-js/react)
- [Vue Stripe Documentation](https://stripe.com/docs/stripe-js/elements/quickstart#vue)
- [Your Backend Payment Method API](http://localhost:5000/api/client/payment-methods)

---

## Need Help?

If you encounter issues:
1. Check browser console for errors
2. Verify your Stripe publishable key is correct
3. Ensure your backend is running and accessible
4. Check that authentication token is being sent correctly


