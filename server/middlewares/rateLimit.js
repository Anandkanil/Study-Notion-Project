/*
 * Small in-memory rate limiter (fixed window). Enough for a single Render instance;
 * swap for a shared store (Redis) if the API ever runs on several instances.
 *
 *   rateLimit({ name: 'login', windowMs: 15 * 60e3, max: 10, key: (req) => req.ip })
 */
const buckets = new Map(); // `${name}:${key}` -> { count, resetAt }

// Drop expired buckets every minute so memory stays flat
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}, 60 * 1000);
sweep.unref?.();

const clientIp = (req) => req.ip || req.socket?.remoteAddress || 'unknown';

/** Normalised email from the body, for per-account limits. */
const emailKey = (req) => String(req.body?.email || '').trim().toLowerCase() || clientIp(req);

function rateLimit({ name, windowMs, max, key = clientIp, message }) {
  return (req, res, next) => {
    const id = `${name}:${key(req)}`;
    const now = Date.now();
    let bucket = buckets.get(id);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(id, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfter));
      const minutes = Math.ceil(retryAfter / 60);
      return res.status(429).json({
        success: false,
        message: message || `Too many attempts. Please wait ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} and try again.`,
      });
    }
    next();
  };
}

/** For tests */
rateLimit._reset = () => buckets.clear();

module.exports = { rateLimit, emailKey, clientIp };
