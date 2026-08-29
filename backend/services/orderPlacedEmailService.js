import {
  sendOrderEmail as sendOrderEmailFromMain,
} from './emailService.js';

export async function sendOrderEmail({
  to,
  customerName,
  orderId,
  total,
  items,
  address,
  billing = {},
}) {
  return sendOrderEmailFromMain({
    to,
    customerName,
    orderId,
    total,
    items,
    address,
    status: 'PLACED',
    billing,
  });
}