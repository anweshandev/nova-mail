/**
 * Simple in-memory rate limiter
 */
const requests = new Map();

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000;
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

export function rateLimiter(req, res, next) {
  const clientId = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Clean old entries
  for (const [key, data] of requests) {
    if (now - data.windowStart > WINDOW_MS) {
      requests.delete(key);
    }
  }
  
  const clientData = requests.get(clientId);
  
  if (!clientData) {
    requests.set(clientId, { windowStart: now, count: 1 });
    return next();
  }
  
  if (now - clientData.windowStart > WINDOW_MS) {
    requests.set(clientId, { windowStart: now, count: 1 });
    return next();
  }
  
  clientData.count++;
  
  if (clientData.count > MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((WINDOW_MS - (now - clientData.windowStart)) / 1000),
    });
  }
  
  next();
}
