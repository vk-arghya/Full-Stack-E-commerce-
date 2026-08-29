import { adminDb } from '../config/firebaseAdmin.js';
import { sendCustomPickleEmail } from '../services/customEmailService.js';

export async function createCustomRequest(req, res) {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 100);
    const mobile = String(req.body?.mobile || '').trim().slice(0, 20);
    const requirement = String(req.body?.requirement || '').trim().slice(0, 3000);
    if (!name || !/^[0-9+ -]{10,15}$/.test(mobile) || requirement.length < 5) return res.status(400).json({ message: 'Please enter a valid name, mobile number and customization request.' });
    const now = new Date();
    const ref = adminDb.collection('customRequests').doc();
    const data = { name, mobile, requirement, email: req.user?.email || '', userId: req.user?.uid || null, status: 'NEW', createdAt: now, updatedAt: now };
    await ref.set(data);
    try { await sendCustomPickleEmail({ name, mobile, requirement, userEmail: req.user?.email || '' }); }
    catch (emailError) { console.error('custom request email failed:', emailError.message); }
    res.status(201).json({ id: ref.id, message: 'Thanks for connecting with us. We will get back to you soon.' });
  } catch (e) { console.error('createCustomRequest:', e); res.status(400).json({ message: e.message || 'Unable to submit customization request' }); }
}
