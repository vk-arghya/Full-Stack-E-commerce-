import { sendOrderEmail } from './emailService.js';

export async function sendOrderAcceptedEmail({ to, customerName, orderId, total, items, address, billing = {} }) {
  return sendOrderEmail({
    to,
    customerName,
    orderId,
    total,
    items,
    address,
    status: 'ACCEPTED',
    billing,
  });
}
