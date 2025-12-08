import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios"
import defu from "defu"

export const cfetch = async (
	url: string,
	options: AxiosRequestConfig = {},
	authorize: boolean = true
): Promise<AxiosResponse> => {
	const baseUrl = import.meta.env.VITE_PUBLIC_BACKEND

	if (!baseUrl) throw new Error("BACKEND URL not set")

	const { sessionToken, refreshSessionToken } = useAuth()

	const defaults: AxiosRequestConfig = {
		baseURL: baseUrl,
	}

	if (authorize) {
		let token = sessionToken.value

		if (token) defaults.headers = { Authorization: `Bearer ${token}` }
		else
			defaults.headers = {
				Authorization: `Bearer ${await refreshSessionToken()}`,
			}
	}

	const config: AxiosRequestConfig = defu(options, defaults)

	let response
	try {
		response = await axios(url, config)
	} catch {
		if (response?.status == 401) {
			if (!config.headers) config.headers = {}
			config.headers.Authorization = `Bearer ${await refreshSessionToken()}`

			response = await axios(url, config)
		}
	}

	if (!response) throw new Error("Something went wrong. Please try again")
	return response
}
