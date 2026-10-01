import type { UseFetchOptions } from "#app"
import defu from "defu"

export function useApiFetch<DataT = any, ErrorT = any>(
	url: string | Request | Ref<string | Request> | (() => string | Request),
	options?: UseFetchOptions<DataT, ErrorT>,
	authorize: boolean = true,
): ReturnType<typeof useFetch<DataT, ErrorT>> {
	const { refreshSession } = useAuth()

	const defaults: UseFetchOptions<DataT, ErrorT> = {
		// The migrated API lives in this Nuxt app under server/api.
		baseURL: "/api",

		retry: 1,
		retryDelay: 0,
		retryStatusCodes: [401],

		headers: {},
		onResponseError: async ({ request, response, options }) => {
			if (response.status == 401 && authorize) {
				const refreshed = await refreshSession()

				if (!refreshed.ok) return

				if (import.meta.server && refreshed.sessionCookie) {
					const headers = new Headers(options.headers as HeadersInit)
					const cookies = (headers.get("cookie") ?? "")
						.split(";")
						.map((cookie) => cookie.trim())
						.filter((cookie) => cookie && !cookie.startsWith("musicSession="))
					cookies.push(refreshed.sessionCookie)
					headers.set("cookie", cookies.join("; "))
					options.headers = headers
				}
			}
		},
	}

	const config: UseFetchOptions<DataT, ErrorT> = defu(options ?? {}, defaults)

	// @ts-ignore
	return useFetch<DataT, ErrorT>(url, config)
}
