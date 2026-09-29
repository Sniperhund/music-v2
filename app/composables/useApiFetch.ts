import type { UseFetchOptions } from "#app"
import defu from "defu"

export function useApiFetch<DataT = any, ErrorT = any>(
	url: string | Request | Ref<string | Request> | (() => string | Request),
	options?: UseFetchOptions<DataT, ErrorT>,
	authorize: boolean = true,
): ReturnType<typeof useFetch<DataT, ErrorT>> {
	const { sessionToken, refreshSessionToken } = useAuth()

	const defaults: UseFetchOptions<DataT, ErrorT> = {
		// The migrated API lives in this Nuxt app under server/api.
		baseURL: "/api",

		retry: 1,
		retryDelay: 0,
		retryStatusCodes: [401],

		headers:
			authorize && sessionToken.value
				? { Authorization: `Bearer ${sessionToken.value}` }
				: {},
		onResponseError: async ({ request, response, options }) => {
			if (response.status == 401 && authorize) {
				const newToken = await refreshSessionToken()

				if (!newToken) return

				const headers = new Headers(options.headers as HeadersInit)
				headers.set("Authorization", `Bearer ${newToken}`)
				options.headers = headers
			}
		},
	}

	const config: UseFetchOptions<DataT, ErrorT> = defu(options ?? {}, defaults)

	// @ts-ignore
	return useFetch<DataT, ErrorT>(url, config)
}
