import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios"
import defu from "defu"

export const cfetch = async (
	url: string,
	options: AxiosRequestConfig = {},
	authorize: boolean = true
): Promise<AxiosResponse> => {
	const baseUrl = import.meta.env.VITE_PUBLIC_BACKEND

	const defaults: AxiosRequestConfig = {
		baseURL: baseUrl,
	}

	if (authorize) {
		let token = (await cookieStore.get("sessionToken"))?.value

		if (token) defaults.headers = { Authorization: `Bearer ${token}` }
	}

	const config: AxiosRequestConfig = defu(options, defaults)

	return await axios(url, config)
}
