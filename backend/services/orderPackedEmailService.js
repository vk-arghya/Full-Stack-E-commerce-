import { sendOrderEmail } from './emailService.js';

export async function sendOrderPackedEmail({ to, customerName, orderId, total, items, address, billing = {} }) {
  return sendOrderEmail({
    to,
    customerName,
    orderId,
    total,
    items,
    address,
    status: 'PACKED',
    billing,
  });
}
