type RateLimitEntry = { count: number; resetAt: number };
const globalForRateLimit = globalThis as typeof globalThis & { __sastabazarRateLimits?: Map<string, RateLimitEntry> };
const store = globalForRateLimit.__sastabazarRateLimits ?? new Map<string, RateLimitEntry>();
globalForRateLimit.__sastabazarRateLimits = store;
export function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim() || 'unknown';
}
export function checkRateLimit({ key, limit, windowMs }: { key: string; limit: number; windowMs: number }): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now(); const current = store.get(key);
  if (!current || current.resetAt <= now) { store.set(key, { count: 1, resetAt: now + windowMs }); return { allowed: true, retryAfterSeconds: 0 }; }
  if (current.count >= limit) return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  current.count += 1; return { allowed: true, retryAfterSeconds: 0 };
}
