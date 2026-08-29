import crypto from 'crypto';
import { razorpay } from '../config/razorpay.js';

/**
 * Create Razorpay order
 */
export async function createRazorpayOrder({
  amount,
  receipt,
}) {
  const numericAmount = Math.round(
    Number(amount)
  );

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Invalid payment amount');
  }

  // Test mode only when Razorpay is explicitly disabled
  if (!razorpay) {
    return {
      id: `TEST_ORDER_${Date.now()}`,
      amount: numericAmount,
      currency: 'INR',
      testMode: true,
    };
  }

  return razorpay.orders.create({
    amount: numericAmount,
    currency: 'INR',
    receipt: String(receipt || `order_${Date.now()}`),
  });
}


/**
 * Verify Razorpay payment signature
 */
export function verifyRazorpaySignature({
  orderId,
  paymentId,
  signature,
}) {
  const enabled =
    String(
      process.env.RAZORPAY_ENABLED || ''
    )
      .trim()
      .toLowerCase() === 'true';

  /*
   * Test verification is allowed ONLY when
   * Razorpay has explicitly been disabled.
   */
  if (!enabled) {
    return (
      String(orderId || '').startsWith(
        'TEST_ORDER_'
      ) &&
      String(paymentId || '').startsWith(
        'TEST_PAYMENT_'
      )
    );
  }

  const secret =
    String(
      process.env.RAZORPAY_KEY_SECRET || ''
    ).trim();

  if (
    !secret ||
    !orderId ||
    !paymentId ||
    !signature
  ) {
    return false;
  }

  const expected =
    crypto
      .createHmac('sha256', secret)
      .update(
        `${orderId}|${paymentId}`
      )
      .digest('hex');

  const expectedBuffer =
    Buffer.from(expected, 'utf8');

  const signatureBuffer =
    Buffer.from(
      String(signature),
      'utf8'
    );

  if (
    expectedBuffer.length !==
    signatureBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    signatureBuffer
  );
}


/**
 * Fetch payment details from Razorpay.
 *
 * Used after successful payment so the backend
 * can obtain the real payment method, UPI VPA,
 * payment status, etc.
 */
export async function fetchRazorpayPayment(
  paymentId
) {
  if (!razorpay) {
    return null;
  }

  const id =
    String(paymentId || '').trim();

  if (!id) {
    throw new Error(
      'Razorpay payment ID is missing'
    );
  }

  return razorpay.payments.fetch(id);
}