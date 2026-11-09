import { deleteCookie, getCookie, readBody, setResponseStatus } from "h3"
import argon2 from "argon2"
import { User } from "../../models/user"
import { getSessionModel } from "../../models/session"
import {
	defineAuthenticatedEventHandler,
	requireAuthenticatedUser,
	getSessionTtl,
	REFRESH_COOKIE,
	SESSION_COOKIE,
} from "../../utils/auth"
import { getAuthValidationMessage } from "../../utils/auth-validation"

export default defineAuthenticatedEventHandler(async (event) => {
	const authenticatedUser = await requireAuthenticatedUser(event)
	const body = await readBody(event).catch(() => undefined)
	const validationMessage = getAuthValidationMessage(body, [
		{ name: "currentPassword", minimumLength: 8 },
		{ name: "newPassword", minimumLength: 8 },
	])
	if (validationMessage) {
		setResponseStatus(event, 400)
		return { message: validationMessage }
	}

	const user = await User.findById(authenticatedUser._id).select("+passwordHash")
	if (!user) {
		setResponseStatus(event, 404)
		return { message: "User not found" }
	}

	let passwordMatches = false
	try {
		passwordMatches = await argon2.verify(user.passwordHash, body.currentPassword)
	} catch {
		// Malformed stored hashes are treated as a failed current password.
	}
	if (!passwordMatches) {
		setResponseStatus(event, 400)
		return { message: "The current password is wrong" }
	}

	await User.updateOne(
		{ _id: user._id },
		{
			$set: { passwordHash: await argon2.hash(body.newPassword), refreshTokens: [] },
			$unset: { refreshToken: "", refreshTokenExpiresAt: "" },
		},
	)

	const Session = getSessionModel(getSessionTtl(event))
	await Session.deleteMany({ userId: user._id })
	const refreshToken = getCookie(event, REFRESH_COOKIE)
	const sessionToken = getCookie(event, SESSION_COOKIE)
	if (refreshToken) deleteCookie(event, REFRESH_COOKIE, { path: "/", sameSite: "lax", secure: !import.meta.dev })
	if (sessionToken) deleteCookie(event, SESSION_COOKIE, { path: "/", sameSite: "lax", secure: !import.meta.dev })
	return {}
})
