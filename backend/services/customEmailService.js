const EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send';

function config() {
  return {
    serviceId: String(process.env.CUSTOM_EMAILJS_SERVICE_ID || '').trim(),
    templateId: String(process.env.CUSTOM_EMAILJS_TEMPLATE_ID || '').trim(),
    publicKey: String(process.env.CUSTOM_EMAILJS_PUBLIC_KEY || '').trim(),
    privateKey: String(process.env.CUSTOM_EMAILJS_PRIVATE_KEY || '').trim(),
    recipient: String(process.env.CUSTOM_EMAILJS_TO || '').trim(),
  };
}

export function customEmailConfigured() {
  const c = config();
  return Boolean(c.serviceId && c.templateId && c.publicKey && c.privateKey && c.recipient);
}

export async function sendCustomPickleEmail({ name, mobile, requirement, userEmail = '' }) {
  const c = config();
  if (!customEmailConfigured()) throw new Error('Customized pickle email is not configured.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(EMAILJS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        service_id: c.serviceId,
        template_id: c.templateId,
        user_id: c.publicKey,
        accessToken: c.privateKey,
        template_params: {
          to_email: c.recipient,
          customer_email: userEmail || '',
          customer_name: String(name || '').trim(),
          mobile: String(mobile || '').trim(),
          requirement: String(requirement || '').trim(),
          store_name: "Acharjya's Achar Bari",
        },
      }),
    });
    const body = await response.text().catch(() => '');
    if (!response.ok) throw new Error(`Customized EmailJS request failed (${response.status})${body ? `: ${body.slice(0, 300)}` : ''}`);
    return { sent: true };
  } finally { clearTimeout(timeout); }
}
