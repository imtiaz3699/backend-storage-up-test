import getStripe from '../config/stripe.js';
import Invoice from '../models/Invoice.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import { emitNotificationToUser } from '../utils/socketService.js';

/**
 * Create Stripe Checkout Session for an invoice
 * This generates a payment link that the user can use to pay the invoice
 */
export const createInvoiceCheckoutSession = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    // Find the invoice
    const invoice = await Invoice.findById(invoiceId);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Invoice is already paid',
        data: {
          invoice_id: invoice.invoice_id,
          status: invoice.status
        }
      });
    }

    // Check if invoice is cancelled
    if (invoice.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot create payment session for cancelled invoice'
      });
    }

    // Get user information
    let customerEmail = invoice.customer_email;
    let customerName = invoice.customer_name;
    let stripeCustomerId = null;

    if (invoice.customer_id) {
      const user = await User.findById(invoice.customer_id);
      if (user) {
        customerEmail = user.email || invoice.customer_email;
        customerName = user.name || invoice.customer_name;
        stripeCustomerId = user.stripe_customer_id || null;
      }
    }

    // If invoice already has a checkout session, check if it's still valid
    if (invoice.stripe_checkout_session_id) {
      try {
        const stripe = getStripe();
        const existingSession = await stripe.checkout.sessions.retrieve(
          invoice.stripe_checkout_session_id
        );
        
        // If session is still open, return it
        if (existingSession.status === 'open') {
          return res.status(200).json({
            success: true,
            message: 'Payment session already exists',
            data: {
              checkout_url: existingSession.url,
              session_id: existingSession.id,
              invoice_id: invoice.invoice_id,
              amount: invoice.amount
            }
          });
        }
      } catch (error) {
        // Session might not exist, continue to create a new one
        console.log('Existing session not found, creating new one');
      }
    }

    const stripe = getStripe();
    let baseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    // Remove trailing slash to avoid double slashes
    baseUrl = baseUrl.replace(/\/+$/, '');

    console.log(`🔵 Creating Stripe checkout session for invoice ${invoice.invoice_id}`);
    console.log(`   Using baseUrl: ${baseUrl} (from CLIENT_URL/FRONTEND_URL env var)`);
    console.log(`   Success URL will be: ${baseUrl}/invoices/${invoice._id}/payment/success`);
    console.log(`   Cancel URL will be: ${baseUrl}/invoices/${invoice._id}/payment/cancel`);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: invoice.invoice_title || `Invoice ${invoice.invoice_id}`,
              description: `Payment for ${invoice.invoice_title || `Invoice ${invoice.invoice_id}`}. Units: ${invoice.unit_number?.join(', ') || 'N/A'}`,
            },
            unit_amount: Math.round(invoice.amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/invoices/${invoice._id}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/invoices/${invoice._id}/payment/cancel`,
      customer_email: customerEmail,
      customer: stripeCustomerId, // If user has Stripe customer ID, use it
      metadata: {
        invoice_id: invoice._id.toString(),
        invoice_number: invoice.invoice_id,
        customer_id: invoice.customer_id?.toString() || '',
      },
    });

    // Save checkout session ID to invoice
    invoice.stripe_checkout_session_id = session.id;
    invoice.stripe_payment_status = 'pending';
    await invoice.save();

    res.status(200).json({
      success: true,
      message: 'Payment session created successfully',
      data: {
        checkout_url: session.url,
        session_id: session.id,
        invoice_id: invoice.invoice_id,
        amount: invoice.amount,
        expires_at: new Date(session.expires_at * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        success: false,
        message: 'Stripe error: ' + error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating payment session',
      error: error.message
    });
  }
};

/**
 * Get payment link for an invoice
 * Creates a new session if one doesn't exist or is expired
 */
export const getInvoicePaymentLink = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    const invoice = await Invoice.findById(invoiceId);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    if (invoice.status === 'paid') {
      return res.status(200).json({
        success: true,
        message: 'Invoice is already paid',
        data: {
          invoice_id: invoice.invoice_id,
          status: invoice.status,
          paid_at: invoice.paid_at
        }
      });
    }

    // If invoice has a checkout session, check if it's still valid
    if (invoice.stripe_checkout_session_id) {
      try {
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.retrieve(
          invoice.stripe_checkout_session_id
        );
        
        if (session.status === 'open' && session.payment_status === 'unpaid') {
          return res.status(200).json({
            success: true,
            message: 'Payment session found',
            data: {
              checkout_url: session.url,
              session_id: session.id,
              invoice_id: invoice.invoice_id,
              amount: invoice.amount,
              expires_at: new Date(session.expires_at * 1000).toISOString()
            }
          });
        }
      } catch (error) {
        // Session might not exist, continue to create a new one
        console.log('Session check failed, creating new one');
      }
    }

    // Create a new checkout session
    return createInvoiceCheckoutSession(req, res);
  } catch (error) {
    console.error('Error getting payment link:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting payment link',
      error: error.message
    });
  }
};

/**
 * Handle Stripe webhook events
 * This endpoint is called by Stripe when payment events occur
 */
export const handleStripeWebhook = async (req, res) => {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('⚠️  STRIPE_WEBHOOK_SECRET is not set in environment variables');
    return res.status(500).json({
      success: false,
      message: 'Webhook secret not configured'
    });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('⚠️  Webhook signature verification failed:', err.message);
    return res.status(400).json({
      success: false,
      message: `Webhook Error: ${err.message}`
    });
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        
        // Find invoice by checkout session ID
        const invoice = await Invoice.findOne({
          stripe_checkout_session_id: session.id
        });

        if (invoice) {
          // Check if payment was successful
          if (session.payment_status === 'paid') {
            invoice.status = 'paid';
            invoice.stripe_payment_intent_id = session.payment_intent;
            invoice.stripe_payment_status = 'succeeded';
            invoice.paid_at = new Date();
            await invoice.save();

            console.log(`✅ Invoice ${invoice.invoice_id} marked as paid via webhook`);

            // Send notification to user about successful payment
            if (invoice.customer_id) {
              try {
                const notification = await Notification.create({
                  user_id: invoice.customer_id,
                  type: 'invoice_paid',
                  title: 'Payment Successful',
                  message: `Your payment of $${invoice.amount.toFixed(2)} for invoice ${invoice.invoice_id} has been successfully processed.`,
                  data: {
                    invoice_id: invoice._id.toString(),
                    invoice_number: invoice.invoice_id,
                    amount: invoice.amount,
                    paid_at: invoice.paid_at,
                    status: 'paid'
                  }
                });

                // Emit socket notification
                emitNotificationToUser(invoice.customer_id.toString(), {
                  id: notification._id.toString(),
                  type: notification.type,
                  title: notification.title,
                  message: notification.message,
                  data: notification.data,
                  read: notification.read,
                  createdAt: notification.createdAt
                });

                console.log(`🔔 Payment notification sent to user ${invoice.customer_id} for invoice ${invoice.invoice_id}`);
              } catch (notificationError) {
                console.error(`❌ Failed to send payment notification for invoice ${invoice.invoice_id}:`, notificationError.message);
              }
            }

            // Send notification to admins about successful payment
            try {
              const { emitNotificationToAdmin } = await import('../utils/socketService.js');
              await emitNotificationToAdmin({
                type: 'payment_received',
                title: 'Payment Received',
                message: `${invoice.customer_name || 'Customer'} paid $${invoice.amount.toFixed(2)} for invoice ${invoice.invoice_id}`,
                priority: 'high',
                data: {
                  invoice_id: invoice._id.toString(),
                  invoice_number: invoice.invoice_id,
                  customer_id: invoice.customer_id?.toString(),
                  customer_name: invoice.customer_name,
                  customer_email: invoice.customer_email,
                  amount: invoice.amount,
                  paid_at: invoice.paid_at,
                  payment_method: 'stripe'
                }
              });
              console.log(`📢 Admin notification sent for payment on invoice ${invoice.invoice_id}`);
            } catch (adminNotificationError) {
              console.error(`❌ Failed to send admin notification for payment:`, adminNotificationError.message);
            }

            // Create Payment record if it doesn't exist
            try {
              const existingPayment = await Payment.findOne({
                stripe_payment_intent_id: session.payment_intent
              });

              if (!existingPayment) {
                const payment = await Payment.create({
                  invoice_id: invoice._id,
                  invoice_number: invoice.invoice_id,
                  customer_id: invoice.customer_id,
                  customer_name: invoice.customer_name,
                  customer_email: invoice.customer_email,
                  amount: invoice.amount,
                  currency: session.currency || 'usd',
                  stripe_checkout_session_id: session.id,
                  stripe_payment_intent_id: session.payment_intent,
                  stripe_payment_status: 'succeeded',
                  paid_at: new Date(),
                  payment_method_type: 'card',
                });

                console.log(`✅ Payment record created for invoice ${invoice.invoice_id}: ${payment._id}`);

                // Create Transaction record and add to user's transactions array
                try {
                  const transaction = await Transaction.create({
                    status: 'paid',
                    payment_id: payment._id,
                    invoice_id: invoice._id,
                    amount: invoice.amount,
                    transaction_type: 'payment'
                  });

                  // Add transaction to user's transactions array
                  if (invoice.customer_id) {
                    await User.findByIdAndUpdate(
                      invoice.customer_id,
                      { $addToSet: { transactions: transaction._id } }
                    );
                    console.log(`✅ Transaction record added to user ${invoice.customer_id}: ${transaction._id}`);
                  }
                } catch (transactionError) {
                  console.error(`❌ Error creating Transaction record:`, transactionError.message);
                  // Don't fail if transaction creation fails
                }
              } else {
                console.log(`ℹ️  Payment record already exists for payment intent: ${session.payment_intent}`);
              }
            } catch (paymentError) {
              console.error(`❌ Error creating Payment record:`, paymentError.message);
              // Don't fail the webhook if Payment record creation fails
            }
          }
        } else {
          console.warn(`⚠️  Invoice not found for session: ${session.id}`);
        }
        break;

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        
        // Find invoice by payment intent ID
        const invoiceByIntent = await Invoice.findOne({
          stripe_payment_intent_id: paymentIntent.id
        });

        if (invoiceByIntent && invoiceByIntent.status !== 'paid') {
          invoiceByIntent.status = 'paid';
          invoiceByIntent.stripe_payment_status = 'succeeded';
          invoiceByIntent.paid_at = new Date();
          await invoiceByIntent.save();

          console.log(`✅ Invoice ${invoiceByIntent.invoice_id} marked as paid via payment_intent webhook`);

          // Send notification to user about successful payment
          if (invoiceByIntent.customer_id) {
            try {
              const notification = await Notification.create({
                user_id: invoiceByIntent.customer_id,
                type: 'invoice_paid',
                title: 'Payment Successful',
                message: `Your payment of $${invoiceByIntent.amount.toFixed(2)} for invoice ${invoiceByIntent.invoice_id} has been successfully processed.`,
                data: {
                  invoice_id: invoiceByIntent._id.toString(),
                  invoice_number: invoiceByIntent.invoice_id,
                  amount: invoiceByIntent.amount,
                  paid_at: invoiceByIntent.paid_at,
                  status: 'paid'
                }
              });

              // Emit socket notification
              emitNotificationToUser(invoiceByIntent.customer_id.toString(), {
                id: notification._id.toString(),
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data,
                read: notification.read,
                createdAt: notification.createdAt
              });

              console.log(`🔔 Payment notification sent to user ${invoiceByIntent.customer_id} for invoice ${invoiceByIntent.invoice_id}`);
            } catch (notificationError) {
              console.error(`❌ Failed to send payment notification for invoice ${invoiceByIntent.invoice_id}:`, notificationError.message);
            }
          }

          // Send notification to admins about successful payment
          try {
            const { emitNotificationToAdmin } = await import('../utils/socketService.js');
            await emitNotificationToAdmin({
              type: 'payment_received',
              title: 'Payment Received',
              message: `${invoiceByIntent.customer_name || 'Customer'} paid $${invoiceByIntent.amount.toFixed(2)} for invoice ${invoiceByIntent.invoice_id}`,
              priority: 'high',
              data: {
                invoice_id: invoiceByIntent._id.toString(),
                invoice_number: invoiceByIntent.invoice_id,
                customer_id: invoiceByIntent.customer_id?.toString(),
                customer_name: invoiceByIntent.customer_name,
                customer_email: invoiceByIntent.customer_email,
                amount: invoiceByIntent.amount,
                paid_at: invoiceByIntent.paid_at,
                payment_method: 'stripe'
              }
            });
            console.log(`📢 Admin notification sent for payment on invoice ${invoiceByIntent.invoice_id}`);
          } catch (adminNotificationError) {
            console.error(`❌ Failed to send admin notification for payment:`, adminNotificationError.message);
          }

          // Create Payment record if it doesn't exist
          try {
            const existingPayment = await Payment.findOne({
              stripe_payment_intent_id: paymentIntent.id
            });

            if (!existingPayment) {
              // Try to find checkout session ID from invoice
              const checkoutSessionId = invoiceByIntent.stripe_checkout_session_id;
              
              const payment = await Payment.create({
                invoice_id: invoiceByIntent._id,
                invoice_number: invoiceByIntent.invoice_id,
                customer_id: invoiceByIntent.customer_id,
                customer_name: invoiceByIntent.customer_name,
                customer_email: invoiceByIntent.customer_email,
                amount: invoiceByIntent.amount,
                currency: paymentIntent.currency || 'usd',
                stripe_checkout_session_id: checkoutSessionId,
                stripe_payment_intent_id: paymentIntent.id,
                stripe_payment_status: 'succeeded',
                paid_at: new Date(),
                payment_method_type: paymentIntent.payment_method_types?.[0] || 'card',
              });

              console.log(`✅ Payment record created for invoice ${invoiceByIntent.invoice_id}: ${payment._id}`);

              // Create Transaction record and add to user's transactions array
              try {
                const transaction = await Transaction.create({
                  status: 'paid',
                  payment_id: payment._id,
                  invoice_id: invoiceByIntent._id,
                  amount: invoiceByIntent.amount,
                  transaction_type: 'payment'
                });

                // Add transaction to user's transactions array
                if (invoiceByIntent.customer_id) {
                  await User.findByIdAndUpdate(
                    invoiceByIntent.customer_id,
                    { $addToSet: { transactions: transaction._id } }
                  );
                  console.log(`✅ Transaction record added to user ${invoiceByIntent.customer_id}: ${transaction._id}`);
                }
              } catch (transactionError) {
                console.error(`❌ Error creating Transaction record:`, transactionError.message);
                // Don't fail if transaction creation fails
              }
            }
          } catch (paymentError) {
            console.error(`❌ Error creating Payment record:`, paymentError.message);
            // Don't fail the webhook if Payment record creation fails
          }
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        
        // Find invoice by payment intent ID
        const failedInvoice = await Invoice.findOne({
          stripe_payment_intent_id: failedPayment.id
        });

        if (failedInvoice) {
          failedInvoice.stripe_payment_status = 'failed';
          await failedInvoice.save();

          console.log(`❌ Payment failed for invoice: ${failedInvoice.invoice_id}`);

          // Send notification to admins about failed payment
          try {
            const { emitNotificationToAdmin } = await import('../utils/socketService.js');
            await emitNotificationToAdmin({
              type: 'payment_failed',
              title: 'Payment Failed',
              message: `Payment failed for invoice ${failedInvoice.invoice_id} - ${failedInvoice.customer_name || 'Customer'}`,
              priority: 'high',
              data: {
                invoice_id: failedInvoice._id.toString(),
                invoice_number: failedInvoice.invoice_id,
                customer_id: failedInvoice.customer_id?.toString(),
                customer_name: failedInvoice.customer_name,
                customer_email: failedInvoice.customer_email,
                amount: failedInvoice.amount,
                failure_reason: failedPayment.last_payment_error?.message || 'Unknown error',
                failed_at: new Date().toISOString()
              }
            });
            console.log(`📢 Admin notification sent for failed payment on invoice ${failedInvoice.invoice_id}`);
          } catch (adminNotificationError) {
            console.error(`❌ Failed to send admin notification for failed payment:`, adminNotificationError.message);
          }
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message
    });
  }
};

/**
 * Get payment status for an invoice
 */
export const getInvoicePaymentStatus = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    const invoice = await Invoice.findById(invoiceId).select(
      'invoice_id status amount stripe_checkout_session_id stripe_payment_intent_id stripe_payment_status paid_at'
    );
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    let paymentDetails = null;

    // If invoice has Stripe session, get latest status from Stripe
    if (invoice.stripe_checkout_session_id) {
      try {
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.retrieve(
          invoice.stripe_checkout_session_id
        );

        paymentDetails = {
          session_id: session.id,
          payment_status: session.payment_status,
          status: session.status,
          amount_total: session.amount_total ? session.amount_total / 100 : null,
          currency: session.currency,
          customer_email: session.customer_email,
          expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
          url: session.url
        };

        // Update invoice if payment status changed
        if (session.payment_status === 'paid' && invoice.status !== 'paid') {
          invoice.status = 'paid';
          invoice.stripe_payment_status = 'succeeded';
          invoice.stripe_payment_intent_id = session.payment_intent;
          invoice.paid_at = new Date();
          await invoice.save();

          // Create Payment record if it doesn't exist
          try {
            const existingPayment = await Payment.findOne({
              stripe_payment_intent_id: session.payment_intent
            });

            if (!existingPayment) {
              const payment = await Payment.create({
                invoice_id: invoice._id,
                invoice_number: invoice.invoice_id,
                customer_id: invoice.customer_id,
                customer_name: invoice.customer_name,
                customer_email: invoice.customer_email,
                amount: invoice.amount,
                currency: session.currency || 'usd',
                stripe_checkout_session_id: session.id,
                stripe_payment_intent_id: session.payment_intent,
                stripe_payment_status: 'succeeded',
                paid_at: new Date(),
                payment_method_type: 'card',
              });

              console.log(`✅ Payment record created for invoice ${invoice.invoice_id}: ${payment._id}`);
            }
          } catch (paymentError) {
            console.error(`❌ Error creating Payment record:`, paymentError.message);
          }
        }
      } catch (error) {
        console.error('Error fetching Stripe session:', error);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        invoice_id: invoice.invoice_id,
        status: invoice.status,
        amount: invoice.amount,
        stripe_payment_status: invoice.stripe_payment_status,
        paid_at: invoice.paid_at,
        payment_details: paymentDetails
      }
    });
  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting payment status',
      error: error.message
    });
  }
};

/**
 * Verify payment success using session_id from Stripe redirect
 * This endpoint is called from the success page with session_id as query parameter
 */
export const verifyPaymentSuccess = async (req, res) => {
  try {
    const { session_id } = req.query;
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    const stripe = getStripe();

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Find the invoice associated with this session
    const invoice = await Invoice.findOne({
      stripe_checkout_session_id: session_id
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found for this payment session'
      });
    }

    // Update invoice status if payment was successful
    if (session.payment_status === 'paid' && invoice.status !== 'paid') {
      invoice.status = 'paid';
      invoice.stripe_payment_status = 'succeeded';
      invoice.stripe_payment_intent_id = session.payment_intent;
      invoice.paid_at = new Date();
      await invoice.save();

      console.log(`✅ Invoice ${invoice.invoice_id} marked as paid via success page verification`);

      // Create Payment record if it doesn't exist
      try {
        const existingPayment = await Payment.findOne({
          stripe_payment_intent_id: session.payment_intent
        });

        if (!existingPayment) {
          const payment = await Payment.create({
            invoice_id: invoice._id,
            invoice_number: invoice.invoice_id,
            customer_id: invoice.customer_id,
            customer_name: invoice.customer_name,
            customer_email: invoice.customer_email,
            amount: invoice.amount,
            currency: session.currency || 'usd',
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent,
            stripe_payment_status: 'succeeded',
            paid_at: new Date(),
            payment_method_type: 'card',
          });

          console.log(`✅ Payment record created for invoice ${invoice.invoice_id}: ${payment._id}`);

          // Create Transaction record and add to user's transactions array
          try {
            const transaction = await Transaction.create({
              status: 'paid',
              payment_id: payment._id,
              invoice_id: invoice._id,
              amount: invoice.amount,
              transaction_type: 'payment'
            });

            // Add transaction to user's transactions array
            if (invoice.customer_id) {
              await User.findByIdAndUpdate(
                invoice.customer_id,
                { $addToSet: { transactions: transaction._id } }
              );
              console.log(`✅ Transaction record added to user ${invoice.customer_id}: ${transaction._id}`);
            }
          } catch (transactionError) {
            console.error(`❌ Error creating Transaction record:`, transactionError.message);
            // Don't fail if transaction creation fails
          }
        }
      } catch (paymentError) {
        console.error(`❌ Error creating Payment record:`, paymentError.message);
        // Don't fail the verification if Payment record creation fails
      }
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        invoice_id: invoice.invoice_id,
        invoice_title: invoice.invoice_title,
        amount: invoice.amount,
        status: invoice.status,
        payment_status: session.payment_status,
        session_id: session.id,
        payment_intent_id: session.payment_intent,
        paid_at: invoice.paid_at,
        customer_email: session.customer_email
      }
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: error.message
    });
  }
};

