import type { UseFetchOptions } from "#app"
import defu from "defu"

export function useApiFetch<DataT = any, ErrorT = any>(
	url: string | Request | Ref<string | Request> | (() => string | Request),
	options?: UseFetchOptions<DataT, ErrorT>,
	authorize: boolean = true,
): ReturnType<typeof useFetch<DataT, ErrorT>> {
	const baseUrl = import.meta.env.VITE_PUBLIC_BACKEND

	if (!baseUrl) throw new Error("BACKEND URL not set")

	const { sessionToken, refreshSessionToken } = useAuth()

	const defaults: UseFetchOptions<DataT, ErrorT> = {
		baseURL: baseUrl,

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

				options.headers = {
					...(options.headers as unknown as Record<string, string>),
					// @ts-ignore
					Authorization: `Bearer ${newToken}`,
				}
			}
		},
	}

	const config: UseFetchOptions<DataT, ErrorT> = defu(options ?? {}, defaults)

	// @ts-ignore
	return useFetch<DataT, ErrorT>(url, config)
}
