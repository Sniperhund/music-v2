import { readBody, setCookie, setResponseStatus } from "h3"
import argon2 from "argon2"
import { User } from "../../models/user"
import { REFRESH_COOKIE } from "../../utils/auth"
import { getAuthValidationMessage } from "../../utils/auth-validation"

export default defineEventHandler(async (event) => {
	const body = await readBody(event)
	const validationMessage = getAuthValidationMessage(body, [
		{ name: "email", email: true },
		{ name: "password", minimumLength: 8 },
	])
	if (validationMessage) {
		setResponseStatus(event, 400)
		return { message: validationMessage }
	}

	const user = await User.findOne({ email: body.email.toLowerCase() }).select(
		"+refreshToken +passwordHash",
	)
	let passwordMatches = false
	if (user) {
		try {
			// Bun.password's default output is PHC Argon2id and argon2 verifies
			// its encoded algorithm and parameters directly.
			passwordMatches = await argon2.verify(user.passwordHash, body.password)
		} catch {
			// Malformed or unsupported stored hashes must not reveal account state.
		}
	}

	if (!user || !passwordMatches) {
		setResponseStatus(event, 400)
		return { message: "The email or password is wrong" }
	}

	setCookie(event, REFRESH_COOKIE, user.refreshToken, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: !import.meta.dev,
		...(body.remember ? { maxAge: 60 * 60 * 24 * 30 } : {}),
	})
	setResponseStatus(event, 200)
	// The long-lived refresh token is deliberately omitted from the JSON body.
	return {}
})
