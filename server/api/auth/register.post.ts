import { readBody, setCookie, setResponseStatus } from "h3"
import argon2 from "argon2"
import { User } from "../../models/user"
import {
	assertCookieRequestOrigin,
	defineAuthenticatedEventHandler,
	REFRESH_COOKIE,
} from "../../utils/auth"
import { getAuthValidationMessage } from "../../utils/auth-validation"

export default defineAuthenticatedEventHandler(async (event) => {
	assertCookieRequestOrigin(event)
	const body = await readBody(event)
	const validationMessage = getAuthValidationMessage(body, [
		{ name: "name" },
		{ name: "email", email: true },
		{ name: "password", minimumLength: 8 },
	])
	if (validationMessage) {
		setResponseStatus(event, 400)
		return { message: validationMessage }
	}

	const email = body.email.toLowerCase()
	if (await User.findOne({ email })) {
		setResponseStatus(event, 400)
		return { message: "The email is already in use" }
	}

	try {
		const user = await User.create({
			name: body.name,
			email,
			passwordHash: await argon2.hash(body.password),
		})
		const refreshToken = await User.findById(user._id).select("+refreshToken").then((doc) => doc?.refreshToken)

		if (!refreshToken) throw new Error("Unable to create refresh token")

		setCookie(event, REFRESH_COOKIE, refreshToken, {
			path: "/",
			httpOnly: true,
			sameSite: "lax",
			secure: !import.meta.dev,
		})
		setResponseStatus(event, 201)
		// Refresh credentials are now delivered only through the HttpOnly cookie.
		return {}
	} catch (error) {
		if ((error as { code?: number }).code === 11000) {
			setResponseStatus(event, 400)
			return { message: "The email is already in use" }
		}
		throw error
	}
})
