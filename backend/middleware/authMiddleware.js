import { adminAuth } from '../config/firebaseAdmin.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication required' });
    const token = header.slice(7).trim();
    if (!token) return res.status(401).json({ message: 'Authentication required' });
    req.user = await adminAuth.verifyIdToken(token);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid authentication token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.admin === true) return next();
  return res.status(403).json({ message: 'Admin access required' });
}
