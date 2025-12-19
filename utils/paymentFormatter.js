import Transaction from '../models/Transaction.js';

/**
 * Format payment with Transaction_id from associated Transaction
 * @param {Object} payment - Payment document
 * @returns {Object} Formatted payment object
 */
export const formatPaymentWithTransactionId = async (payment) => {
  // Find the transaction associated with this payment
  let transactionId = payment._id.toString(); // Fallback to payment _id
  
  try {
    const transaction = await Transaction.findOne({ payment_id: payment._id });
    if (transaction && transaction.transaction_id) {
      transactionId = transaction.transaction_id;
    }
  } catch (error) {
    console.error('Error finding transaction for payment:', error.message);
  }

  return {
    Date: payment.paid_at || payment.createdAt,
    Transaction_id: transactionId,
    Description: payment.invoice_id?.invoice_title || `Invoice ${payment.invoice_number || 'N/A'}`,
    Amount: payment.amount,
    Payment_Method: payment.payment_method_type || 'card',
    Status: payment.stripe_payment_status === 'succeeded' ? 'Paid' : 
            payment.stripe_payment_status === 'failed' ? 'Failed' :
            payment.stripe_payment_status === 'pending' ? 'Pending' :
            payment.stripe_payment_status === 'canceled' ? 'Canceled' : 'Pending',
    // Keep original fields for backward compatibility
    _id: payment._id,
    invoice_id: payment.invoice_id,
    customer_id: payment.customer_id,
    invoice_number: payment.invoice_number,
    stripe_checkout_session_id: payment.stripe_checkout_session_id,
    stripe_payment_intent_id: payment.stripe_payment_intent_id,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt
  };
};


