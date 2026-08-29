import Razorpay from 'razorpay';

const enabled =
  String(process.env.RAZORPAY_ENABLED || '')
    .trim()
    .toLowerCase() === 'true';

const keyId =
  String(process.env.RAZORPAY_KEY_ID || '').trim();

const keySecret =
  String(process.env.RAZORPAY_KEY_SECRET || '').trim();

let razorpay = null;

if (enabled && keyId && keySecret) {
  razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  console.log('✓ Razorpay enabled');
} else {
  console.log(
    'ℹ️ Razorpay is disabled. Running in test mode.'
  );
}

export {
  razorpay,
  keyId as razorpayKeyId,
};