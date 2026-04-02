import { supabaseAdmin } from '../services/supabase.js';
import { getUserProfile } from '../services/user.service.js';

async function attachProfile(req, res, next) {
  try {
    if (!req.user?.id) return next();
    const profile = await getUserProfile(req.user.id);
    if (profile?.status === 'suspended') {
      return res.status(403).json({ message: 'Account suspended' });
    }
    req.userProfile = profile;
    return next();
  } catch (err) {
    return next(err);
  }
}

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Missing token' });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = data.user;
    return attachProfile(req, res, next);
  } catch (err) {
    next(err);
  }
}

export async function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return next();
  }
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return next();
    }
    req.user = data.user;
    return attachProfile(req, res, next);
  } catch (err) {
    return next();
  }
}
