import { getUserProfile } from '../services/user.service.js';

export async function adminMiddleware(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Missing token' });
    }
    const profile = req.userProfile || await getUserProfile(req.user.id);
    if (profile?.status === 'suspended') {
      return res.status(403).json({ message: 'Account suspended' });
    }
    if (!profile?.is_admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    req.userProfile = profile;
    return next();
  } catch (err) {
    return next(err);
  }
}
