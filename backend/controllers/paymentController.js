import { adminDb } from '../config/firebaseAdmin.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../services/razorpayService.js';

const DEFAULT_STORE_SETTINGS = Object.freeze({
  gstPercent: 2.36,
  freeDeliveryThreshold: 350,
  normalWestBengalUnder500: 25,
  normalWestBengalOver500: 50,
  normalOutsideWestBengalSurcharge: 25,
  platformFeeEnabled: false,
  platformFee: 10,
  superFastEnabled: true,
  superFastFee: 85,
  normalStateCharges: {},
});

const money = (value) => Math.round((Number(value) || 0) * 100) / 100;

async function getStoreSettings() {
  const snap = await adminDb.collection('settings').doc('store').get();
  return { ...DEFAULT_STORE_SETTINGS, ...(snap.exists ? snap.data() : {}) };
}

function normalizeItems(input) {
  if (!Array.isArray(input) || !input.length || input.length > 50) throw new Error('Invalid cart');
  return input.map((item) => {
    const quantity = Math.floor(Number(item.quantity));
    const productId = String(item.productId || '').trim();
    const weight = String(item.weight || '').trim();
    if (!productId || !weight || quantity < 1 || quantity > 99) throw new Error('Invalid cart item');
    return { productId, weight, quantity };
  });
}

function weightToGrams(value) {
  const text = String(value || '').trim().toLowerCase().replace(/\s+/g, '');
  const match = text.match(/([0-9]+(?:\.[0-9]+)?)(kg|g)$/);
  if (!match) return 0;
  const amount = Number(match[1]);
  return match[2] === 'kg' ? amount * 1000 : amount;
}

function totalWeightGrams(items) {
  return items.reduce((sum, item) => sum + weightToGrams(item.weight) * Number(item.quantity || 0), 0);
}

function isWestBengal(state) {
  return /^(west\s*bengal|wb|westbengal)$/i.test(String(state || '').trim());
}

function calculateShipping({ subtotal, weightGrams, state, deliveryMode, settings }) {
  const mode = String(deliveryMode || 'NORMAL').toUpperCase();
  if (mode === 'SUPERFAST') {
    if (settings.superFastEnabled !== true) throw new Error('Super Fast Delivery is currently unavailable');
    return { mode, shipping: money(settings.superFastFee), freeDelivery: false, freeDeliveryThreshold: null, amountToFree: 0 };
  }
  if (mode !== 'NORMAL') throw new Error('Invalid delivery mode');
  const threshold = money(settings.freeDeliveryThreshold);
  const normalizedState = String(state || '').trim().toLowerCase();
  const overrides = settings.normalStateCharges && typeof settings.normalStateCharges === 'object' ? settings.normalStateCharges : {};
  const overrideKey = Object.keys(overrides).find(key => String(key).trim().toLowerCase() === normalizedState);
  const hasOverride = Boolean(overrideKey && Number.isFinite(Number(overrides[overrideKey])));
  const base = weightGrams > 500 ? Number(settings.normalWestBengalOver500) : Number(settings.normalWestBengalUnder500);
  const regularShipping = money(hasOverride ? Number(overrides[overrideKey]) : base + (isWestBengal(state) ? 0 : Number(settings.normalOutsideWestBengalSurcharge)));
  if (subtotal >= threshold) return { mode, shipping: 0, regularShipping, freeDelivery: true, freeDeliveryThreshold: threshold, amountToFree: 0 };
  return { mode, shipping: regularShipping, regularShipping, freeDelivery: false, freeDeliveryThreshold: threshold, amountToFree: money(threshold - subtotal) };
}

async function getCouponForUser(uid, code) {
  const couponRef = adminDb.collection('coupons').doc(code);
  const [couponSnap, redemptionSnap] = await Promise.all([
    couponRef.get(),
    adminDb.collection('users').doc(uid).collection('couponRedemptions').doc(code).get(),
  ]);
  if (!couponSnap.exists) throw new Error('Invalid coupon code');
  if (redemptionSnap.exists) throw new Error('You have already used this promo code. Each promo code can be used only once per account.');
  const coupon = { id: couponSnap.id, ...couponSnap.data() };
  const expiry = coupon.expiresAt?.toDate?.() || (coupon.expiresAt ? new Date(coupon.expiresAt) : null);
  if (coupon.active !== true || (expiry && !Number.isNaN(expiry.getTime()) && expiry <= new Date())) throw new Error('This coupon has expired or is disabled');
  if (Number(coupon.maxUses || 0) > 0 && Number(coupon.usedCount || 0) >= Number(coupon.maxUses)) throw new Error('This coupon is no longer available');
  return { couponRef, coupon };
}

async function buildQuote(requestedItems, { uid, couponCode = '', addressId = '', deliveryMode = 'NORMAL' } = {}) {
  const productRefs = requestedItems.map((item) => adminDb.collection('products').doc(item.productId));
  const productSnaps = await adminDb.getAll(...productRefs);
  const productMap = new Map(productSnaps.map((snap) => [snap.id, snap]));
  const verifiedItems = [];
  let subtotal = 0;
  for (const item of requestedItems) {
    const snap = productMap.get(item.productId);
    if (!snap?.exists) throw new Error(`Product ${item.productId} is unavailable`);
    const product = snap.data();
    const variant = (product.variants || []).find((v) => String(v.weight) === item.weight);
    if (!variant) throw new Error(`${product.name} / ${item.weight} is unavailable`);
    const stock = Number(variant.stock);
    if (!Number.isFinite(stock) || stock < item.quantity) throw new Error(`${product.name} has only ${variant.stock} left`);
    const price = Math.round(Number(variant.price));
    if (!Number.isFinite(price) || price < 0) throw new Error(`${product.name} has an invalid price`);
    subtotal += price * item.quantity;
    verifiedItems.push({ key: `${snap.id}:${item.weight}`, productId: snap.id, name: product.name, image: product.image || '', weight: item.weight, price, quantity: item.quantity, maxStock: stock });
  }
  if (!Number.isFinite(subtotal) || subtotal <= 0) throw new Error('Invalid order total');

  let discount = 0;
  let coupon = null;
  if (couponCode) {
    const result = await getCouponForUser(uid, couponCode);
    coupon = result.coupon;
    discount = coupon.discountType === 'flat'
      ? Math.min(subtotal, Math.max(0, Number(coupon.value || 0)))
      : Math.min(subtotal, Math.round(subtotal * Math.max(0, Number(coupon.value || 0)) / 100));
  }

  const settings = await getStoreSettings();
  let address = null;
  if (addressId) {
    const addressSnap = await adminDb.collection('users').doc(uid).collection('addresses').doc(addressId).get();
    if (!addressSnap.exists) throw new Error('Selected delivery address was not found');
    address = addressSnap.data();
  }

  const netMerchandise = Math.max(0, subtotal - discount);
  const shippingInfo = address
    ? calculateShipping({ subtotal, weightGrams: totalWeightGrams(verifiedItems), state: address.state, deliveryMode, settings })
    : { mode: String(deliveryMode || 'NORMAL').toUpperCase(), shipping: 0, freeDelivery: false, freeDeliveryThreshold: money(settings.freeDeliveryThreshold), amountToFree: subtotal >= Number(settings.freeDeliveryThreshold) ? 0 : money(Number(settings.freeDeliveryThreshold) - subtotal) };
  const platformFee = settings.platformFeeEnabled === true ? money(settings.platformFee) : 0;
  const gst = money((netMerchandise + shippingInfo.shipping + platformFee) * Number(settings.gstPercent) / 100);
  const total = money(netMerchandise + shippingInfo.shipping + platformFee + gst);

  return {
    items: verifiedItems,
    subtotal: money(subtotal),
    discount: money(discount),
    netMerchandise: money(netMerchandise),
    shipping: shippingInfo.shipping,
    regularShipping: money(shippingInfo.regularShipping || shippingInfo.shipping || 0),
    deliveryMode: shippingInfo.mode,
    freeDelivery: shippingInfo.freeDelivery,
    freeDeliveryThreshold: shippingInfo.freeDeliveryThreshold,
    amountToFreeDelivery: shippingInfo.amountToFree,
    platformFee,
    platformFeeDisplayed: money(settings.platformFee),
    superFastFee: money(settings.superFastFee),
    superFastEnabled: settings.superFastEnabled === true,
    platformFeeEnabled: settings.platformFeeEnabled === true,
    gstPercent: Number(settings.gstPercent),
    gst,
    total,
    weightGrams: totalWeightGrams(verifiedItems),
    coupon: coupon ? { code: coupon.code || couponCode, discountType: coupon.discountType, value: Number(coupon.value || 0) } : null,
  };
}

export async function quotePayment(req, res) {
  try {
    const items = normalizeItems(req.body?.items);
    const code = String(req.body?.code || '').trim().toUpperCase();
    const addressId = String(req.body?.addressId || '').trim();
    const deliveryMode = String(req.body?.deliveryMode || 'NORMAL').toUpperCase();
    res.json(await buildQuote(items, { uid: req.user.uid, couponCode: code, addressId, deliveryMode }));
  } catch (e) { console.error('quotePayment:', e); res.status(400).json({ message: e.message || 'Unable to calculate current order price' }); }
}

export async function createPaymentOrder(req, res) {
  try {
    const requestedItems = normalizeItems(req.body?.items);
    const addressId = String(req.body?.addressId || '').trim();
    const couponCode = String(req.body?.couponCode || '').trim().toUpperCase();
    const deliveryMode = String(req.body?.deliveryMode || 'NORMAL').trim().toUpperCase();
    if (!addressId) return res.status(400).json({ message: 'Delivery address is required' });

    const quote = await buildQuote(requestedItems, { uid: req.user.uid, couponCode, addressId, deliveryMode });
    const sessionRef = adminDb.collection('paymentSessions').doc();
    const session = {
      userId: req.user.uid,
      addressId,
      items: quote.items.map(({ maxStock, ...item }) => item),
      subtotal: quote.subtotal,
      netMerchandise: quote.netMerchandise,
      shipping: quote.shipping,
      deliveryMode: quote.deliveryMode,
      discount: quote.discount,
      couponCode: quote.coupon?.code || couponCode || null,
      platformFee: quote.platformFee,
      platformFeeDisplayed: quote.platformFeeDisplayed,
      platformFeeEnabled: quote.platformFeeEnabled,
      gstPercent: quote.gstPercent,
      gst: quote.gst,
      total: quote.total,
      status: 'CREATED',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };

    const order = await createRazorpayOrder({ amount: Math.round(quote.total * 100), receipt: `AAB-${sessionRef.id}` });
    session.providerOrderId = order.id;
    await sessionRef.set(session);

    res.json({ paymentSessionId: sessionRef.id, razorpayOrderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID || '', testMode: Boolean(order.testMode), ...quote, couponCode: session.couponCode });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || 'Unable to create payment order' });
  }
}

export async function validateCoupon(req, res) {
  try {
    const code = String(req.body?.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ message: 'Enter a coupon code' });
    const quote = await buildQuote(normalizeItems(req.body?.items), { uid: req.user.uid, couponCode: code, addressId: String(req.body?.addressId || ''), deliveryMode: String(req.body?.deliveryMode || 'NORMAL') });
    res.json({ code, ...quote, discountType: quote.coupon?.discountType, value: quote.coupon?.value });
  } catch (e) { console.error('validateCoupon:', e); res.status(400).json({ message: e.message || 'Unable to validate coupon' }); }
}

export async function verifyPayment(req, res) {
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature, paymentSessionId } = req.body || {};
    if (!orderId || !paymentId || !paymentSessionId) return res.status(400).json({ verified: false, message: 'Missing payment response' });
    const sessionRef = adminDb.collection('paymentSessions').doc(paymentSessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) return res.status(404).json({ verified: false, message: 'Payment session not found' });
    const session = sessionSnap.data();
    if (session.userId !== req.user.uid) return res.status(403).json({ verified: false, message: 'Payment session does not belong to you' });
    if (session.providerOrderId !== orderId) return res.status(400).json({ verified: false, message: 'Payment order mismatch' });
    if (session.status === 'CONSUMED') return res.status(409).json({ verified: false, message: 'Payment session has already been used' });
    if (session.expiresAt?.toDate?.() < new Date()) return res.status(400).json({ verified: false, message: 'Payment session expired' });
    const verified = verifyRazorpaySignature({ orderId, paymentId, signature });
    if (!verified) return res.status(400).json({ verified: false, message: 'Invalid payment signature' });
    await sessionRef.update({ status: 'VERIFIED', paymentId, signature: process.env.RAZORPAY_ENABLED === 'true' ? signature : 'TEST_MODE', verifiedAt: new Date() });
    res.json({ verified: true, testMode: process.env.RAZORPAY_ENABLED !== 'true', paymentSessionId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ verified: false, message: 'Unable to verify payment' });
  }
}
