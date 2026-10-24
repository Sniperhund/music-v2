type CacheEntry = {
	expiresAt: number
	value?: unknown
	pending?: Promise<unknown>
}

const MAX_ENTRIES = 100
const CACHE_TTL_MS = 30_000
const entries = new Map<string, CacheEntry>()
const fetchRequest = $fetch as (request: any, options?: any) => Promise<any>

function requestKey(request: string | Request, options: Record<string, any> = {}) {
	const url = request instanceof Request ? request.url : request
	const method = String(options.method ?? (request instanceof Request ? request.method : "GET")).toUpperCase()
	const query = options.query ?? options.params
	const headers = new Headers(options.headers ?? (request instanceof Request ? request.headers : undefined))
	const headerKey = [...headers.entries()].sort(([a], [b]) => a.localeCompare(b))
	return JSON.stringify([method, url, query, headerKey, options.baseURL ?? ""])
}

export async function cachedRequest<T>(
	request: string | Request,
	options: Record<string, any> = {},
): Promise<T> {
	const method = String(options.method ?? (request instanceof Request ? request.method : "GET")).toUpperCase()
	if (method !== "GET") return fetchRequest(request, options) as Promise<T>

	const key = requestKey(request, options)
	const now = Date.now()
	const cached = entries.get(key)
	if (cached && cached.expiresAt > now) {
		entries.delete(key)
		entries.set(key, cached)
		return (cached.pending ? await cached.pending : cached.value) as T
	}
	if (cached) entries.delete(key)

	const entry: CacheEntry = { expiresAt: now + CACHE_TTL_MS }
	entry.pending = fetchRequest(request, options).then(
		(value) => {
			entry.value = value
			entry.expiresAt = Date.now() + CACHE_TTL_MS
			entry.pending = undefined
			return value
		},
		(error) => {
			entries.delete(key)
			throw error
		},
	)
	entries.set(key, entry)
	while (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value!)
	return await entry.pending as T
}

export function prefetchRequest(request: string, options: Record<string, any> = {}) {
	return cachedRequest(request, { baseURL: "/api", ...options }).then(() => undefined).catch(() => undefined)
}
