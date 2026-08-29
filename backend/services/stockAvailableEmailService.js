import {
  sendEmailTemplate,
} from './emailService.js';

export async function sendStockAvailableEmail({
  to,
  customerName,
  productName,
}) {
  const recipient =
    String(to || '').trim();

  if (!recipient) {
    throw new Error(
      'Customer email address is missing.'
    );
  }

  return sendEmailTemplate({
    to: recipient,

    event: 'STOCK',

    templateParams: {
      to_email: recipient,

      user_email: recipient,

      customer_email:
        recipient,

      customer_name:
        customerName ||
        'Customer',

      product_name:
        productName ||
        'Your saved pickle',

      store_name:
        "Acharjya's Achar Bari",
    },
  });
}