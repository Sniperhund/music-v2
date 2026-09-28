import { appendResponseHeader } from "h3"

export default defineNuxtRouteMiddleware(async (to) => {
	if (to.path.startsWith("/auth")) return

	const auth = useAuth()
	try {
		// Forward the incoming SSR credentials to this endpoint; the browser sends
		// same-origin cookies automatically during client navigation.
		const requestHeaders = import.meta.server
			? useRequestHeaders(["cookie", "authorization"])
			: undefined
		const response = await $fetch.raw<{
			authenticated: boolean
			sessionToken?: string
		}>("/api/auth/session", { headers: requestHeaders })
		const session = response._data

		// Nuxt forwards incoming request cookies automatically, but internal SSR
		// fetch responses do not forward Set-Cookie to the browser automatically.
		if (import.meta.server) {
			const event = useRequestEvent()
			if (event) {
				for (const cookie of response.headers.getSetCookie()) {
					appendResponseHeader(event, "set-cookie", cookie)
				}
			}
		}

		if (session?.sessionToken) auth.sessionToken.value = session.sessionToken
		if (session?.authenticated) return
	} catch {
		// Treat unavailable auth state as unauthenticated.
	}

	return navigateTo("/auth/signin")
})
