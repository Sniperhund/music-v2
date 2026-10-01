import type { FetchOptions } from "ofetch"

type RequestConfig = Omit<FetchOptions, "body" | "query"> & {
	data?: unknown
	params?: Record<string, unknown>
	forceFormData?: boolean
}

const hasFile = (value: unknown): boolean => {
	if (!value || typeof value !== "object") return false

	const isFile = (item: unknown) =>
		typeof File !== "undefined" && item instanceof File
	const isBlob = (item: unknown) =>
		typeof Blob !== "undefined" && item instanceof Blob

	return Object.values(value).some(
		(item) =>
			isFile(item) ||
			isBlob(item) ||
			(Array.isArray(item) && item.some((entry) => isFile(entry) || isBlob(entry))),
	)
}

const toApiUrl = (url: string) => {
	if (url === "/api" || url.startsWith("/api/")) return url
	return `/api${url.startsWith("/") ? url : `/${url}`}`
}

export const cfetch = async <DataT = any>(
	url: string,
	options: RequestConfig = {},
	authorize = true,
): Promise<DataT> => {
	const { data, params, forceFormData, ...fetchOptions } = options
	const headers = new Headers(fetchOptions.headers as HeadersInit | undefined)
	const requestOptions: FetchOptions = {
		...fetchOptions,
		query: params ?? (fetchOptions as FetchOptions).query,
		body: data ?? (fetchOptions as FetchOptions).body,
		headers,
	}

	if (
		requestOptions.body &&
		(typeof requestOptions.body === "object" || forceFormData) &&
		(hasFile(requestOptions.body) || forceFormData)
	) {
		const form = new FormData()

		for (const [key, value] of Object.entries(requestOptions.body as Record<string, unknown>)) {
			if (Array.isArray(value)) {
				value.forEach((entry) => form.append(key, entry as string | Blob))
			} else if (value !== undefined && value !== null) {
				form.append(key, value as string | Blob)
			}
		}

		requestOptions.body = form
		headers.delete("Content-Type")
	}

	try {
		return (await $fetch(toApiUrl(url), requestOptions as any)) as DataT
	} catch (error: any) {
		if (!authorize || error?.response?.status !== 401) throw error

		const refreshed = await useAuth().refreshSession()
		if (!refreshed.ok) throw error

		if (import.meta.server && refreshed.sessionCookie) {
			const cookies = (headers.get("cookie") ?? "")
				.split(";")
				.map((cookie) => cookie.trim())
				.filter((cookie) => cookie && !cookie.startsWith("musicSession="))
			cookies.push(refreshed.sessionCookie)
			headers.set("cookie", cookies.join("; "))
		}

		return (await $fetch(toApiUrl(url), requestOptions as any)) as DataT
	}
}
