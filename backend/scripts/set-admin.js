import 'dotenv/config';
import { adminAuth, adminDb } from '../config/firebaseAdmin.js';

const email = String(process.argv[2] || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run admin:set -- admin@example.com');
  process.exit(1);
}

const user = await adminAuth.getUserByEmail(email);
await adminAuth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), admin: true });
await adminDb.collection('users').doc(user.uid).set({ role: 'admin', updatedAt: new Date() }, { merge: true });
console.log(`Admin access granted to ${user.email}. Ask the user to sign out and sign in again so the ID token refreshes.`);
