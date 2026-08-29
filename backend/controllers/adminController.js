import { adminDb } from '../config/firebaseAdmin.js';
import { emailConfigured, sendEmailTemplate } from '../services/emailService.js';

const collectionRef = (name) => adminDb.collection(name);

const DEFAULT_STORE_SETTINGS = { gstPercent: 2.36, freeDeliveryThreshold: 350, normalWestBengalUnder500: 25, normalWestBengalOver500: 50, normalOutsideWestBengalSurcharge: 25, platformFeeEnabled: false, platformFee: 10, superFastEnabled: true, superFastFee: 85 };

async function listCollection(name, limit = 500) {
  const snap = await collectionRef(name).limit(limit).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function cleanString(value, max = 1000) {
  return String(value ?? '').trim().slice(0, max);
}

export async function adminMe(req, res) {
  const profileSnap = await adminDb.collection('users').doc(req.user.uid).get();
  res.json({
    uid: req.user.uid,
    email: req.user.email || '',
    name: req.user.name || '',
    isAdmin: true,
    profile: profileSnap.exists ? { id: profileSnap.id, ...profileSnap.data(), role: 'admin' } : null,
  });
}

export async function listCustomers(_req, res) {
  try {
    const users = await listCollection('users');
    const orders = await listCollection('orders');
    const orderCount = new Map();
    const spend = new Map();
    for (const order of orders) {
      orderCount.set(order.userId, (orderCount.get(order.userId) || 0) + 1);
      spend.set(order.userId, (spend.get(order.userId) || 0) + Number(order.total || 0));
    }
    res.json(users.map((u) => ({ ...u, orderCount: orderCount.get(u.id) || 0, totalSpent: spend.get(u.id) || 0 })));
  } catch (e) { console.error(e); res.status(500).json({ message: 'Unable to load customers' }); }
}

export async function listReviews(_req, res) {
  try { res.json(await listCollection('reviews')); }
  catch (e) { console.error(e); res.status(500).json({ message: 'Unable to load reviews' }); }
}

export async function updateReview(req, res) {
  try {
    const ref = collectionRef('reviews').doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ message: 'Review not found' });
    const body = req.body || {};
    const data = {};
    if ('approved' in body) data.approved = Boolean(body.approved);
    if ('published' in body) data.published = Boolean(body.published);
    if ('reply' in body) data.adminReply = cleanString(body.reply, 2000);
    data.updatedAt = new Date();
    await ref.set(data, { merge: true });
    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (e) { console.error(e); res.status(400).json({ message: e.message || 'Unable to update review' }); }
}

export async function deleteReview(req, res) {
  try { await collectionRef('reviews').doc(req.params.id).delete(); res.json({ ok: true }); }
  catch (e) { console.error(e); res.status(500).json({ message: 'Unable to delete review' }); }
}

export async function listCustomRequests(_req, res) {
  try { res.json(await listCollection('customRequests')); }
  catch (e) { console.error(e); res.status(500).json({ message: 'Unable to load custom requests' }); }
}

export async function updateCustomRequest(req, res) {
  const allowed = ['NEW', 'CONTACTED', 'QUOTED', 'ACCEPTED', 'COMPLETED', 'CANCELLED'];
  try {
    const ref = collectionRef('customRequests').doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ message: 'Custom request not found' });
    const status = String(req.body?.status || '').toUpperCase();
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid request status' });
    await ref.set({ status, adminNote: cleanString(req.body?.adminNote, 2000), updatedAt: new Date() }, { merge: true });
    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (e) { console.error(e); res.status(400).json({ message: e.message || 'Unable to update request' }); }
}

export async function deleteCustomRequest(req, res) {
  try { await collectionRef('customRequests').doc(req.params.id).delete(); res.json({ ok: true }); }
  catch (e) { console.error(e); res.status(500).json({ message: 'Unable to delete request' }); }
}

export async function listCoupons(_req, res) {
  try { res.json(await listCollection('coupons')); }
  catch (e) { console.error(e); res.status(500).json({ message: 'Unable to load coupons' }); }
}

export async function createCoupon(req, res) {
  try {
    const code = cleanString(req.body?.code, 40).toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) return res.status(400).json({ message: 'Coupon code must be 3-40 letters/numbers.' });
    const discountType = req.body?.discountType === 'percent' ? 'percent' : 'flat';
    const value = Number(req.body?.value);
    if (!Number.isFinite(value) || value <= 0 || (discountType === 'percent' && value > 100)) return res.status(400).json({ message: 'Invalid coupon value' });
    const ref = collectionRef('coupons').doc(code);
    const existing = await ref.get();
    if (existing.exists) return res.status(409).json({ message: 'Coupon already exists' });
    const data = { code, discountType, value, maxUses: Math.max(0, Math.floor(Number(req.body?.maxUses || 0))), expiresAt: req.body?.expiresAt ? new Date(req.body.expiresAt) : null, active: req.body?.active !== false, visibleToUsers: req.body?.visibleToUsers !== false, usedCount: 0, createdAt: new Date(), updatedAt: new Date() };
    await ref.set(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (e) { console.error(e); res.status(400).json({ message: e.message || 'Unable to create coupon' }); }
}

export async function updateCoupon(req, res) {
  try {
    const ref = collectionRef('coupons').doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ message: 'Coupon not found' });
    const body = req.body || {};
    const data = {};
    if ('discountType' in body) data.discountType = body.discountType === 'percent' ? 'percent' : 'flat';
    if ('value' in body) { const value = Number(body.value); if (!Number.isFinite(value) || value <= 0 || (data.discountType === 'percent' && value > 100)) throw new Error('Invalid coupon value'); data.value = value; }
    if ('maxUses' in body) data.maxUses = Math.max(0, Math.floor(Number(body.maxUses || 0)));
    if ('active' in body) data.active = Boolean(body.active);
    if ('visibleToUsers' in body) data.visibleToUsers = Boolean(body.visibleToUsers);
    if ('expiresAt' in body) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    data.updatedAt = new Date();
    await ref.set(data, { merge: true });
    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (e) { console.error(e); res.status(400).json({ message: e.message || 'Unable to update coupon' }); }
}

export async function deleteCoupon(req, res) {
  try { await collectionRef('coupons').doc(req.params.id).delete(); res.json({ ok: true }); }
  catch (e) { console.error(e); res.status(500).json({ message: 'Unable to delete coupon' }); }
}

export async function reports(req, res) {
  try {
    const [orders, products, users] = await Promise.all([listCollection('orders'), listCollection('products'), listCollection('users')]);
    const completed = orders.filter((o) => o.paymentStatus === 'VERIFIED' && o.orderStatus !== 'CANCELLED');
    const revenue = completed.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const units = new Map();
    for (const order of completed) for (const item of order.items || []) units.set(item.name, (units.get(item.name) || 0) + Number(item.quantity || 0));
    const bestSelling = [...units.entries()].sort((a,b) => b[1] - a[1]).slice(0, 10).map(([name, quantity]) => ({ name, quantity }));
    const lowStock = products.flatMap((p) => (p.variants || []).filter((v) => Number(v.stock) <= 5).map((v) => ({ product: p.name, weight: v.weight, stock: Number(v.stock) })));
    res.json({ revenue, orderCount: completed.length, customerCount: users.length, productCount: products.length, bestSelling, lowStock });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Unable to generate reports' }); }
}


export async function testEmail(req, res) {
  try {
    const to = String(req.body?.to || req.user.email || '').trim();
    if (!to) return res.status(400).json({ message: 'Enter a recipient email address.' });
    if (!emailConfigured()) return res.status(400).json({ message: 'EmailJS is not configured on the backend.' });
    await sendEmailTemplate({
      to,
      templateParams: {
        customer_name: 'Acharjya Admin',
        order_id: 'EMAIL-TEST',
        order_total: '₹99',
        order_status: 'TEST',
        items: 'Traditional Mango Pickle · 100g × 1 — ₹99',
        delivery_address: 'Test delivery address',
        store_name: "Acharjya's Achar Bari",
      },
    });
    res.json({ sent: true, message: `Test email sent to ${to}` });
  } catch (e) { console.error('testEmail:', e); res.status(400).json({ message: e.message || 'Email could not be sent.' }); }
}


export async function getStoreSettings(_req, res) {
  try { const snap = await collectionRef('settings').doc('store').get(); res.json({ ...DEFAULT_STORE_SETTINGS, ...(snap.exists ? snap.data() : {}) }); }
  catch (e) { console.error(e); res.status(500).json({ message: 'Unable to load store settings' }); }
}

export async function updateStoreSettings(req, res) {
  try {
    const body = req.body || {};
    const data = {
      platformFeeEnabled: Boolean(body.platformFeeEnabled),
      platformFee: Math.max(0, Number(body.platformFee)),
      superFastEnabled: Boolean(body.superFastEnabled),
      superFastFee: Math.max(0, Number(body.superFastFee)),
      normalStateCharges: Object.fromEntries(Object.entries(body.normalStateCharges || {}).map(([state, fee]) => [cleanString(state, 60), Math.max(0, Number(fee))]).filter(([state, fee]) => state && Number.isFinite(fee))),
      gstPercent: DEFAULT_STORE_SETTINGS.gstPercent,
      freeDeliveryThreshold: DEFAULT_STORE_SETTINGS.freeDeliveryThreshold,
      normalWestBengalUnder500: DEFAULT_STORE_SETTINGS.normalWestBengalUnder500,
      normalWestBengalOver500: DEFAULT_STORE_SETTINGS.normalWestBengalOver500,
      normalOutsideWestBengalSurcharge: DEFAULT_STORE_SETTINGS.normalOutsideWestBengalSurcharge,
      updatedAt: new Date(),
      updatedBy: req.user.uid,
    };
    if (!Number.isFinite(data.platformFee) || !Number.isFinite(data.superFastFee)) return res.status(400).json({ message: 'Invalid fee value' });
    await collectionRef('settings').doc('store').set(data, { merge: true });
    res.json({ ...DEFAULT_STORE_SETTINGS, ...data });
  } catch (e) { console.error(e); res.status(400).json({ message: e.message || 'Unable to save store settings' }); }
}
