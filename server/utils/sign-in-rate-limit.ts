import { getRequestIP, setHeader } from "h3"
import type { H3Event } from "h3"

const windowMs = 15 * 60 * 1000
const maxFailures = 5
const attemptsByIp = new Map<string, { failures: number; resetAt: number }>()

export function isSignInRateLimited(event: H3Event) {
	const ip = getRequestIP(event) ?? "unknown"
	const now = Date.now()
	let attempt = attemptsByIp.get(ip)

	if (!attempt || attempt.resetAt <= now) {
		attempt = { failures: 0, resetAt: now + windowMs }
		attemptsByIp.set(ip, attempt)
	}

	if (attempt.failures < maxFailures) return false

	setHeader(event, "Retry-After", String(Math.ceil((attempt.resetAt - now) / 1000)))
	return true
}

export function recordSignInFailure(event: H3Event) {
	const ip = getRequestIP(event) ?? "unknown"
	const now = Date.now()
	let attempt = attemptsByIp.get(ip)

	if (!attempt || attempt.resetAt <= now) {
		attempt = { failures: 0, resetAt: now + windowMs }
		attemptsByIp.set(ip, attempt)
	}

	attempt.failures += 1
}

export function clearSignInFailures(event: H3Event) {
	attemptsByIp.delete(getRequestIP(event) ?? "unknown")
}
