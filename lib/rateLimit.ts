/**
 * Simple in-memory rate limiter for Next.js server actions.
 * Resets on server restart — sufficient for a school project.
 */

type Entry = { count: number; resetAt: number }

const store = new Map<string, Entry>()

export function rateLimit(
    key: string,
    limit: number,
    windowMs: number
): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now()
    const entry = store.get(key)

    if (!entry || now > entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs })
        return { allowed: true, retryAfterMs: 0 }
    }

    if (entry.count >= limit) {
        return { allowed: false, retryAfterMs: entry.resetAt - now }
    }

    entry.count++
    return { allowed: true, retryAfterMs: 0 }
}
