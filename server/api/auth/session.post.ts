import { getCookie, readBody, setCookie, setResponseStatus } from "h3"
import { User } from "../../models/user"
import { getSessionModel } from "../../models/session"
import {
	assertCookieRequestOrigin,
	defineAuthenticatedEventHandler,
	getSessionTtl,
	REFRESH_COOKIE,
	SESSION_COOKIE,
} from "../../utils/auth"
import { getAuthValidationMessage } from "../../utils/auth-validation"

export default defineAuthenticatedEventHandler(async (event) => {
	const body = await readBody(event).catch(() => undefined)
	const validationMessage =
		body === undefined ? null : getAuthValidationMessage(body, [{ name: "refreshToken" }])
	if (validationMessage) {
		setResponseStatus(event, 400)
		return { message: validationMessage }
	}

	const bodyRefreshToken = typeof body?.refreshToken === "string" && body.refreshToken
	const cookieRefreshToken = getCookie(event, REFRESH_COOKIE)
	if (!bodyRefreshToken && cookieRefreshToken) assertCookieRequestOrigin(event)
	const refreshToken = bodyRefreshToken || cookieRefreshToken

	if (!refreshToken) {
		setResponseStatus(event, 401)
		return { message: "Invalid refresh token" }
	}

	const user = await User.findOne({ refreshToken }).select("+refreshToken")
	if (!user) {
		setResponseStatus(event, 401)
		return { message: "Invalid refresh token" }
	}

	const ttl = getSessionTtl(event)
	const Session = getSessionModel(ttl)
	const session = await Session.create({ userId: user._id })
	const expireAt = new Date(session.createdAt.getTime() + ttl)

	setCookie(event, SESSION_COOKIE, session.token, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: !import.meta.dev,
		maxAge: Math.floor(ttl / 1000),
	})
	setResponseStatus(event, 201)

	return { expireAt, sessionToken: session.token }
})
