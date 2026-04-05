import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios"
import defu from "defu"

const hasFile = (value: any): boolean => {
	if (!value || typeof value !== "object") return false

	return Object.values(value).some(
		(v) =>
			v instanceof File ||
			v instanceof Blob ||
			(Array.isArray(v) && v.some((i) => i instanceof File)),
	)
}

type RequestConfig = {
	forceFormData?: boolean
} & AxiosRequestConfig

export const cfetch = async (
	url: string,
	options: RequestConfig = {},
	authorize: boolean = true,
): Promise<AxiosResponse> => {
	const baseUrl = import.meta.env.VITE_PUBLIC_BACKEND

	if (!baseUrl) throw new Error("BACKEND URL not set")

	const defaults: AxiosRequestConfig = {
		baseURL: baseUrl,
	}

	if (authorize) {
		const { sessionToken, refreshSessionToken } = useAuth()

		let token = sessionToken.value

		if (token) defaults.headers = { Authorization: `Bearer ${token}` }
		else
			defaults.headers = {
				Authorization: `Bearer ${await refreshSessionToken()}`,
			}
	}

	const config: RequestConfig = defu(options, defaults)

	if (config.data && (hasFile(config.data) || config.forceFormData)) {
		const form = new FormData()

		for (const [key, val] of Object.entries(config.data)) {
			if (Array.isArray(val)) {
				val.forEach((v) => form.append(key, v)) // key as-is, no []
			} else if (val !== undefined && val !== null) {
				form.append(key, val as any)
			}
		}

		config.data = form
		if (!config.headers) config.headers = {}
		delete config.headers["Content-Type"]
	}

	let response
	try {
		response = await axios(url, config)
	} catch (error: any) {
		if (error.response?.status == 401) {
			const { sessionToken, refreshSessionToken } = useAuth()

			if (!config.headers) config.headers = {}
			config.headers.Authorization = `Bearer ${await refreshSessionToken()}`

			response = await axios(url, config)
		} else throw error
	}

	if (!response) throw new Error("Something went wrong. Please try again")
	return response
}
