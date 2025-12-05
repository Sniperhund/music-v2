export default defineNuxtRouteMiddleware((to, from) => {
	const auth = useAuth()

	if (!auth.refreshToken.value && !to.fullPath.includes("/auth"))
		return navigateTo("/auth/signin")
})
