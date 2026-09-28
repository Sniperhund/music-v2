import { getCookie, setCookie } from "h3"
import { User } from "../../models/user"
import { getSessionModel } from "../../models/session"
import {
	findAuthenticatedSession,
	getSessionTtl,
	REFRESH_COOKIE,
	SESSION_COOKIE,
} from "../../utils/auth"

export default defineEventHandler(async (event) => {
	const activeSession = await findAuthenticatedSession(event)
	if (activeSession) {
		return { authenticated: true, sessionToken: activeSession.session.token }
	}

	const refreshToken = getCookie(event, REFRESH_COOKIE)
	if (!refreshToken) return { authenticated: false }

	const user = await User.findOne({ refreshToken }).select("+refreshToken +verified")
	if (!user?.verified) return { authenticated: false }

	const ttl = getSessionTtl(event)
	const Session = getSessionModel(ttl)
	const session = await Session.create({ userId: user._id })
	setCookie(event, SESSION_COOKIE, session.token, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: !import.meta.dev,
		maxAge: Math.floor(ttl / 1000),
	})

	return { authenticated: true, sessionToken: session.token }
})
