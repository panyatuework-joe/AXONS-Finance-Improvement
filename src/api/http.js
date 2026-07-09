export class ApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Wraps a synchronous data operation so it behaves like a real HTTP request:
 * awaited, latent, and occasionally failing. Every mock "endpoint" in src/api
 * goes through this so the rest of the app can treat it like a real API.
 */
export function simulateRequest(fn, opts = {}) {
  const [min, max] = opts.delayMs ?? [350, 800];
  const failRate = opts.failRate ?? 0;
  const delay = min + Math.random() * (max - min);

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < failRate) {
        reject(new ApiError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 503));
        return;
      }
      try {
        resolve(fn());
      } catch (err) {
        reject(err instanceof Error ? err : new ApiError(String(err)));
      }
    }, delay);
  });
}
