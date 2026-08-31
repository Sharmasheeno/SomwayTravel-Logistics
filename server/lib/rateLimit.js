const buckets = new Map();

export const createFixedWindowRateLimiter = ({ limit, windowMs }) => {
  return (key, now = Date.now()) => {
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    if (current.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: current.resetAt };
    }

    current.count += 1;
    return { allowed: true, remaining: limit - current.count, resetAt: current.resetAt };
  };
};

export const publicTrackingRateLimit = createFixedWindowRateLimiter({
  limit: Number(process.env.PUBLIC_TRACKING_RATE_LIMIT || 60),
  windowMs: Number(process.env.PUBLIC_TRACKING_RATE_WINDOW_MS || 60_000),
});

export const rateLimitKeyForRequest = (req) =>
  String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip || "unknown").split(",")[0].trim();
