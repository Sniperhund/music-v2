import axios, { AxiosError } from "axios"

let refreshPromise: Promise<any> | null = null
let waitForPromise: boolean = false

const setCookie = (
	name: string,
	value: string,
	options: {
		maxAge?: number
		path?: string
		sameSite?: "lax" | "strict" | "none"
		secure?: boolean
	} = {},
) => {
	let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`

	if (options.maxAge !== undefined) {
		cookie += `; Max-Age=${options.maxAge}`
	}

	cookie += `; Path=${options.path ?? "/"}`
	cookie += `; SameSite=${options.sameSite ?? "Lax"}`

	if (options.secure) cookie += "; Secure"

	document.cookie = cookie
}

export const useAuth = () => {
	const refreshToken = useCookie<string | null>("refreshToken", {
		sameSite: "lax",
	})

	const sessionToken = useCookie<string | null>("sessionToken", {
		sameSite: "lax",
		maxAge: 60 * 60, // 60 minutes
	})

	const signin = async (
		email: string,
		password: string,
		remember: boolean = false,
	) => {
		try {
			const res = await cfetch(
				"/auth/signin",
				{
					method: "POST",
					data: {
						email,
						password,
					},
				},
				false,
			)

			// NOTE: Quite hacky... this should be changed.
			// TODO: Add httpOnly and update the backend to support that.
			if (remember) {
				setCookie("refreshToken", res.data.refreshToken, {
					maxAge: 60 * 60 * 24 * 30, // 30 days
				})
			} else {
				setCookie("refreshToken", res.data.refreshToken)
			}
			//refreshToken.value = res.data.refreshToken
			await refreshSessionToken()

			await navigateTo("/")
		} catch (e) {
			if (axios.isAxiosError(e) && e.response?.data?.message) {
				throw new Error(e.response.data.message)
			}

			throw new Error("Failed to sign in")
		}
	}

	const signup = async (name: string, email: string, password: string) => {}

	const signout = () => {
		refreshToken.value = null
		sessionToken.value = null
	}

	const refreshSessionToken = async () => {
		if (waitForPromise) {
			// Force it to wait up to 50 ms for it to set refreshPromise, hopefully less
			for (let i = 0; i < 10; i++) {
				if (refreshPromise != null) {
					break
				}

				await new Promise((r) => setTimeout(r, 5))
			}
		}

		waitForPromise = true

		if (refreshPromise != null) {
			waitForPromise = false
			return refreshPromise
		}

		refreshPromise = cfetch(
			"/auth/session",
			{
				data: {
					refreshToken: refreshToken.value,
				},
				method: "POST",
			},
			false,
		)
			.then((res) => {
				const token = res.data.sessionToken
				sessionToken.value = token

				refreshPromise = null

				return token
			})
			.catch((e) => {
				refreshPromise = null
				sessionToken.value = null

				return null
			})
			.finally(() => {
				waitForPromise = false
			})

		return refreshPromise
	}

	if (getCurrentInstance()) {
		onMounted(() => {
			if (refreshToken.value && !sessionToken.value) refreshSessionToken()
		})
	}

	return {
		refreshToken,
		sessionToken,
		signin,
		signup,
		signout,
		refreshSessionToken,
	}
}
