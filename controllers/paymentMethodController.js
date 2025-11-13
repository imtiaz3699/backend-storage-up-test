import getStripe from '../config/stripe.js';
import User from '../models/User.js';
import PaymentMethod from '../models/PaymentMethod.js';

// Add a payment method for the authenticated user
export const addPaymentMethod = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { payment_method_id, card_number, expiration_date, cv, card_holder_name } = req.body;

    try {
      const stripe = getStripe();
      
      // Get or create Stripe customer
      let stripeCustomerId = user.stripe_customer_id;

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: {
            user_id: user._id.toString()
          }
        });
        stripeCustomerId = customer.id;
        
        // Save Stripe customer ID to user
        user.stripe_customer_id = stripeCustomerId;
        await user.save();
      }

      let paymentMethodId;
      let paymentMethodDetails;

      // Option 1: Use PaymentMethod ID (recommended - from Stripe Elements)
      if (payment_method_id) {
        paymentMethodId = payment_method_id;
        
        // Retrieve payment method details
        paymentMethodDetails = await stripe.paymentMethods.retrieve(paymentMethodId);
        
        // Attach payment method to customer if not already attached
        if (!paymentMethodDetails.customer) {
          await stripe.paymentMethods.attach(paymentMethodId, {
            customer: stripeCustomerId
          });
          // Retrieve again to get updated details
          paymentMethodDetails = await stripe.paymentMethods.retrieve(paymentMethodId);
        }
      } 
      // Option 2: Use card details (requires raw card data API enabled in Stripe)
      else if (card_number && expiration_date && cv && card_holder_name) {
        // Parse expiration date (format: MM/YY or MM/YYYY)
        const expParts = expiration_date.split('/');
        if (expParts.length !== 2) {
          return res.status(400).json({
            success: false,
            message: 'Invalid expiration date format. Use MM/YY or MM/YYYY'
          });
        }

        const expMonth = parseInt(expParts[0], 10);
        let expYear = parseInt(expParts[1], 10);
        
        // Convert 2-digit year to 4-digit
        if (expYear < 100) {
          expYear = 2000 + expYear;
        }

        // Validate expiration date
        if (expMonth < 1 || expMonth > 12) {
          return res.status(400).json({
            success: false,
            message: 'Invalid expiration month'
          });
        }

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
          return res.status(400).json({
            success: false,
            message: 'Card has expired'
          });
        }

        // Create payment method using card details
        // NOTE: This requires "Raw card data APIs" to be enabled in your Stripe account
        // See: https://support.stripe.com/questions/enabling-access-to-raw-card-data-apis
        const paymentMethod = await stripe.paymentMethods.create({
          type: 'card',
          card: {
            number: card_number.replace(/\s/g, ''), // Remove spaces
            exp_month: expMonth,
            exp_year: expYear,
            cvc: cv
          },
          billing_details: {
            name: card_holder_name,
            email: user.email
          }
        });

        paymentMethodId = paymentMethod.id;
        
        // Attach payment method to customer
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: stripeCustomerId
        });

        // Get payment method details
        paymentMethodDetails = await stripe.paymentMethods.retrieve(paymentMethodId);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Either payment_method_id (from Stripe Elements) or card details (card_number, expiration_date, cv, card_holder_name) are required'
        });
      }

      // Check if this is the first payment method (make it default)
      const existingMethods = await PaymentMethod.countDocuments({ 
        user: user._id, 
        is_active: true 
      });
      const isDefault = existingMethods === 0;

      // Save payment method to database
      const savedPaymentMethod = await PaymentMethod.create({
        user: user._id,
        stripe_payment_method_id: paymentMethodId,
        stripe_customer_id: stripeCustomerId,
        card_brand: paymentMethodDetails.card?.brand || '',
        card_last4: paymentMethodDetails.card?.last4 || '',
        card_exp_month: paymentMethodDetails.card?.exp_month,
        card_exp_year: paymentMethodDetails.card?.exp_year,
        card_holder_name: card_holder_name || paymentMethodDetails.billing_details?.name || '',
        is_default: isDefault,
        is_active: true
      });

      res.status(201).json({
        success: true,
        message: 'Payment method added successfully',
        data: savedPaymentMethod
      });
    } catch (stripeError) {
      // Handle Stripe-specific errors
      if (stripeError.type === 'StripeCardError') {
        return res.status(400).json({
          success: false,
          message: stripeError.message || 'Card validation failed',
          error: 'CARD_ERROR'
        });
      }

      // Handle raw card data API error
      if (stripeError.message && stripeError.message.includes('Sending credit card numbers directly')) {
        return res.status(400).json({
          success: false,
          message: 'Raw card data APIs are not enabled in your Stripe account. Please use one of the following options:',
          error: 'RAW_CARD_DATA_DISABLED',
          solutions: [
            {
              method: 'Use Stripe Elements (Recommended)',
              description: 'Create a PaymentMethod on the frontend using Stripe Elements, then send the payment_method_id to this endpoint',
              example: {
                payload: {
                  payment_method_id: 'pm_1234567890abcdef'
                }
              },
              documentation: 'https://stripe.com/docs/stripe-js'
            },
            {
              method: 'Enable Raw Card Data APIs',
              description: 'Enable this feature in your Stripe Dashboard (requires approval)',
              steps: [
                '1. Go to Stripe Dashboard → Settings → API',
                '2. Enable "Raw card data APIs"',
                '3. Wait for Stripe approval'
              ],
              documentation: 'https://support.stripe.com/questions/enabling-access-to-raw-card-data-apis'
            }
          ]
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error processing payment method',
        error: stripeError.message
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding payment method',
      error: error.message
    });
  }
};

// Get all payment methods for the authenticated user
export const getPaymentMethods = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const paymentMethods = await PaymentMethod.find({
      user: user._id,
      is_active: true
    }).sort({ is_default: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: paymentMethods
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payment methods',
      error: error.message
    });
  }
};

// Set a payment method as default
export const setDefaultPaymentMethod = async (req, res) => {
  try {
    const user = req.user;
    const { paymentMethodId } = req.params;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const paymentMethod = await PaymentMethod.findOne({
      _id: paymentMethodId,
      user: user._id,
      is_active: true
    });

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // Set all payment methods to not default
    await PaymentMethod.updateMany(
      { user: user._id },
      { is_default: false }
    );

    // Set this one as default
    paymentMethod.is_default = true;
    await paymentMethod.save();

    res.status(200).json({
      success: true,
      message: 'Default payment method updated successfully',
      data: paymentMethod
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating default payment method',
      error: error.message
    });
  }
};

// Delete a payment method
export const deletePaymentMethod = async (req, res) => {
  try {
    const user = req.user;
    const { paymentMethodId } = req.params;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const paymentMethod = await PaymentMethod.findOne({
      _id: paymentMethodId,
      user: user._id
    });

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    try {
      const stripe = getStripe();
      
      // Detach payment method from Stripe customer
      await stripe.paymentMethods.detach(paymentMethod.stripe_payment_method_id);
    } catch (stripeError) {
      // If payment method is already detached, continue
      if (stripeError.code !== 'resource_missing') {
        throw stripeError;
      }
    }

    // Soft delete (set is_active to false)
    paymentMethod.is_active = false;
    await paymentMethod.save();

    res.status(200).json({
      success: true,
      message: 'Payment method deleted successfully',
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting payment method',
      error: error.message
    });
  }
};

