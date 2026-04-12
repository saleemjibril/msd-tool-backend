const buckets = new Map();

function key(req, suffix = "") {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  return `${ip}:${suffix}`;
}

/**
 * Simple sliding-window style limiter (fixed window per minute).
 */
export function rateLimit({ windowMs = 60_000, max = 60, keySuffix = "" } = {}) {
  return (req, res, next) => {
    const k = key(req, keySuffix);
    const now = Date.now();
    let b = buckets.get(k);
    if (!b || now - b.start > windowMs) {
      b = { start: now, count: 0 };
      buckets.set(k, b);
    }
    b.count += 1;
    if (b.count > max) {
      return res.status(429).json({ error: "Too many requests. Try again shortly." });
    }
    next();
  };
}
