import axios, { AxiosError } from "axios"

export const useAuth = () => {
	const refreshToken = useCookie<string | null>("refreshToken", {
		sameSite: "lax",
	})

	const sessionToken = useCookie<string | null>("sessionToken", {
		sameSite: "lax",
	})

	const signin = async (
		email: string,
		password: string,
		remember: boolean = false
	) => {
		console.log(email)

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
				false
			)

			refreshToken.value = res.data.refreshToken
		} catch (e) {
			if (axios.isAxiosError(e) && e.response?.data?.message) {
				throw new Error(e.response.data.message)
			}

			throw new Error("Failed to sign in")
		}
	}

	const signup = async (name: string, email: string, password: string) => {}

	const signout = () => {}

	const refreshSessionToken = async () => {}

	return {
		refreshToken,
		sessionToken,
		signin,
		signup,
		signout,
		refreshSessionToken,
	}
}
