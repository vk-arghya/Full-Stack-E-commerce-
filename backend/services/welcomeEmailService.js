import { sendEmailTemplate } from './emailService.js';

export async function sendWelcomeEmail({
  to,
  customerName,
}) {
  const recipient = String(to || '').trim();

  if (!recipient) {
    throw new Error(
      'Customer email address is missing.'
    );
  }

  return sendEmailTemplate({
    to: recipient,

    /*
     * IMPORTANT:
     * This explicitly selects the WELCOME
     * EmailJS service/template.
     *
     * It will NOT use the DEFAULT
     * Order Placed email.
     */
    event: 'WELCOME',

    templateParams: {
      to_email: recipient,

      user_email: recipient,

      customer_email: recipient,

      customer_name:
        customerName || 'Customer',

      store_name:
        "Acharjya's Achar Bari",
    },
  });
}