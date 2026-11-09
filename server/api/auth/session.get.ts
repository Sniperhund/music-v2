import { defineEventHandler, getCookie, setCookie } from "h3"
import { getSessionModel } from "../../models/session"
import {
	findAuthenticatedSession,
	getSessionTtl,
	REFRESH_COOKIE,
	SESSION_COOKIE,
} from "../../utils/auth"
import { findUserByRefreshToken } from "../../utils/refresh-tokens"

export default defineEventHandler(async (event) => {
	const activeSession = await findAuthenticatedSession(event)
	if (activeSession) return { authenticated: true }

	const refreshToken = getCookie(event, REFRESH_COOKIE)
	if (!refreshToken) return { authenticated: false }

	const found = await findUserByRefreshToken(refreshToken, "+verified")
	if (!found?.user.verified) {
		return { authenticated: false }
	}

	const ttl = getSessionTtl(event)
	const Session = getSessionModel(ttl)
	const session = await Session.create({ userId: found.user._id })
	setCookie(event, SESSION_COOKIE, session.token, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: !import.meta.dev,
		maxAge: Math.floor(ttl / 1000),
	})

	return { authenticated: true }
})
