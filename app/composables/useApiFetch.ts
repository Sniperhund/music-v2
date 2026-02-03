import type { UseFetchOptions } from "#app"
import defu from "defu"

export function useApiFetch<DataT = any, ErrorT = any>(
	url: string | Request | Ref<string | Request> | (() => string | Request),
	options?: UseFetchOptions<DataT, ErrorT>,
	authorize: boolean = true
): ReturnType<typeof useFetch<DataT, ErrorT>> {
	const baseUrl = import.meta.env.VITE_PUBLIC_BACKEND

	if (!baseUrl) throw new Error("BACKEND URL not set")

	const { sessionToken, refreshSessionToken } = useAuth()

	const defaults: UseFetchOptions<DataT, ErrorT> = {
		baseURL: baseUrl,

		headers:
			authorize && sessionToken.value
				? { Authorization: `Bearer ${sessionToken.value}` }
				: {},
		onResponseError: async ({ response, options }) => {
			if (response.status == 401 && authorize) {
				const newToken = await refreshSessionToken()

				if (!newToken) return

				const newOptions = {
					...options,
					headers: {
						...(options.headers || {}),
						Authorization: `Bearer ${newToken}`,
					},
				}

				// @ts-ignore
				return await $fetch<DataT, ErrorT>(url, newOptions)
			}
		},
	}

	const config: UseFetchOptions<DataT, ErrorT> = defu(options ?? {}, defaults)

	// @ts-ignore
	return useFetch<DataT, ErrorT>(url, config)
}
