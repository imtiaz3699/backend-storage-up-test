import Stripe from 'stripe';

let stripe = null;

const getStripe = () => {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables. Please add it to your .env file.');
    }

    // Check if using test or live keys
    const isTestMode = secretKey.startsWith('sk_test_');
    const mode = isTestMode ? 'TEST MODE' : 'LIVE MODE';
    console.log(`💳 Stripe initialized in ${mode} (${secretKey.substring(0, 12)}...)`);

    stripe = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia',
    });
  }
  
  return stripe;
};

export default getStripe;

