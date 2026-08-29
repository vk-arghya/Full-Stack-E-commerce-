import { sendOrderEmail } from './emailService.js';

export async function sendOrderShippedEmail({ to, customerName, orderId, total, items, address, billing = {} }) {
  return sendOrderEmail({
    to,
    customerName,
    orderId,
    total,
    items,
    address,
    status: 'SHIPPED',
    billing,
  });
}
