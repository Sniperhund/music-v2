import { appendResponseHeader } from "h3"

type SessionResponse = {
	sessionToken: string
	expireAt: string
}

export const useAuth = () => {
	const sessionToken = useCookie<string | null>("sessionToken", {
		sameSite: "lax",
		maxAge: 60 * 60,
	})

	let refreshPromise: Promise<string | null> | null = null

	const signin = async (email: string, password: string, remember = false) => {
		try {
			await $fetch("/api/auth/signin", {
				method: "POST",
				body: { email, password, remember: Boolean(remember) },
			})

			if (!(await refreshSessionToken())) throw new Error("Unable to create session")
			await navigateTo("/")
		} catch (error: any) {
			throw new Error(error?.data?.message || error?.statusMessage || "Failed to sign in")
		}
	}

	const signup = async (name: string, email: string, password: string) => {
		try {
			await $fetch("/api/auth/register", {
				method: "POST",
				body: { name, email, password },
			})

			if (!(await refreshSessionToken())) throw new Error("Unable to create session")
			await navigateTo("/")
		} catch (error: any) {
			throw new Error(error?.data?.message || error?.statusMessage || "Failed to sign up")
		}
	}

	const signout = async () => {
		try {
			await $fetch("/api/auth/signout", { method: "POST" })
		} finally {
			sessionToken.value = null
		}
	}

	const refreshSessionToken = async (): Promise<string | null> => {
		if (refreshPromise) return refreshPromise

		refreshPromise = (async () => {
			const response = await $fetch.raw<SessionResponse>(
				"/api/auth/session",
				{
					method: "POST",
					headers: import.meta.server
						? useRequestHeaders(["cookie", "authorization"])
						: undefined,
				},
			)

			if (import.meta.server) {
				const event = useRequestEvent()
				if (event) {
					for (const cookie of response.headers.getSetCookie()) {
						appendResponseHeader(event, "set-cookie", cookie)
					}
				}
			}

			return response._data!
		})()
			.then((response) => {
				sessionToken.value = response.sessionToken
				return response.sessionToken
			})
			.catch(() => {
				sessionToken.value = null
				return null
			})
			.finally(() => {
				refreshPromise = null
			})

		return refreshPromise
	}

	return {
		sessionToken,
		signin,
		signup,
		signout,
		refreshSessionToken,
	}
}
