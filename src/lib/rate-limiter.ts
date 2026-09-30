/**
 * Rate Limiter for AI requests
 * Implements token bucket algorithm with bounded concurrency.
 */

export class RateLimiter {
  private queue: Array<() => void> = []
  private running = 0
  private tokens: number
  private lastRefill: number
  private maxTokens: number
  private refillRate: number // tokens per ms

  constructor(
    private maxConcurrency: number,
    requestsPerMinute: number,
  ) {
    this.maxTokens = requestsPerMinute
    this.tokens = requestsPerMinute
    this.lastRefill = Date.now()
    this.refillRate = requestsPerMinute / 60000 // per millisecond
  }

  private refillTokens() {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate)
    this.lastRefill = now
  }

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        this.refillTokens()
        if (this.running < this.maxConcurrency && this.tokens >= 1) {
          this.running++
          this.tokens--
          resolve(() => {
            this.running--
            if (this.queue.length > 0) {
              const next = this.queue.shift()!
              setTimeout(next, 0)
            }
          })
        } else {
          this.queue.push(tryAcquire)
        }
      }
      tryAcquire()
    })
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire()
    try {
      return await fn()
    } finally {
      release()
    }
  }
}

// Global rate limiter singleton
const maxConcurrency = parseInt(process.env.AI_MAX_CONCURRENCY || '3', 10)
const requestsPerMinute = parseInt(process.env.AI_REQUESTS_PER_MINUTE || '10', 10)

export const aiRateLimiter = new RateLimiter(maxConcurrency, requestsPerMinute)

/**
 * Retry with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: Error | undefined
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err as Error
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }
  throw lastError
}
