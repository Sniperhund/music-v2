export default defineNuxtRouteMiddleware(async () => {
	if (import.meta.server) return

	try {
		const user = await $fetch<{ role?: string }>("/api/user")
		if (user.role !== "admin") return navigateTo("/")
	} catch {
		return navigateTo("/auth/signin")
	}
})
