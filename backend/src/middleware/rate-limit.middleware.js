const buckets = new Map();

export function rateLimit({ windowMs = 60_000, max = 10, keyPrefix = 'rl' } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${keyPrefix}:${req.ip || 'unknown'}`;
    const entry = buckets.get(key);

    if (!entry || entry.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= max) {
      return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }

    entry.count += 1;
    return next();
  };
}
