import { appendResponseHeader } from "h3"

type SessionRefresh = { ok: boolean; sessionCookie?: string }
const refreshPromises = new WeakMap<object, Promise<SessionRefresh>>()

export const useAuth = () => {
	const nuxtApp = useNuxtApp()
	const authenticated = useState("auth:authenticated", () => false)

	const signin = async (email: string, password: string, remember = false) => {
		try {
			await $fetch("/api/auth/signin", {
				method: "POST",
				body: { email, password, remember: Boolean(remember) },
			})

			if (!(await refreshSession()).ok) throw new Error("Unable to create session")
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

			if (!(await refreshSession()).ok) throw new Error("Unable to create session")
			await navigateTo("/")
		} catch (error: any) {
			throw new Error(error?.data?.message || error?.statusMessage || "Failed to sign up")
		}
	}

	const signout = async () => {
		try {
			await $fetch("/api/auth/signout", { method: "POST" })
		} finally {
			authenticated.value = false
		}
	}

	const refreshSession = async (): Promise<SessionRefresh> => {
		const inFlight = refreshPromises.get(nuxtApp)
		if (inFlight) return inFlight

		const refreshPromise = (async () => {
			const response = await $fetch.raw<{ expireAt: string }>(
				"/api/auth/session",
				{
					method: "POST",
					headers: import.meta.server
						? useRequestHeaders(["cookie"])
						: undefined,
				},
			)

			let sessionCookie: string | undefined
			const setCookies = import.meta.server ? response.headers.getSetCookie() : []
			for (const cookie of setCookies) {
				if (!cookie.startsWith("musicSession=")) continue
				sessionCookie = cookie.split(";", 1)[0]
			}

			if (import.meta.server) {
				const event = useRequestEvent()
				if (event) {
					for (const cookie of setCookies) {
						appendResponseHeader(event, "set-cookie", cookie)
					}
				}
			}

			return { ok: true, sessionCookie }
		})()
			.then((result) => {
				authenticated.value = true
				return result
			})
			.catch(() => {
				authenticated.value = false
				return { ok: false }
			})
			.finally(() => {
				refreshPromises.delete(nuxtApp)
			})

		refreshPromises.set(nuxtApp, refreshPromise)
		return refreshPromise
	}

	return {
		authenticated,
		signin,
		signup,
		signout,
		refreshSession,
	}
}
