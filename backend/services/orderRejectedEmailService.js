import { sendOrderEmail } from './emailService.js';

export async function sendOrderRejectedEmail({ to, customerName, orderId, total, items, address, billing = {} }) {
  return sendOrderEmail({
    to,
    customerName,
    orderId,
    total,
    items,
    address,
    status: 'REJECTED',
    billing,
  });
}
