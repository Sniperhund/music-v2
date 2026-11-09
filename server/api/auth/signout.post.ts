import { deleteCookie, getCookie } from "h3"
import { User } from "../../models/user"
import { getSessionModel } from "../../models/session"
import {
	assertCookieRequestOrigin,
	defineAuthenticatedEventHandler,
	REFRESH_COOKIE,
	SESSION_COOKIE,
	getSessionTtl,
} from "../../utils/auth"

export default defineAuthenticatedEventHandler(async (event) => {
	assertCookieRequestOrigin(event)
	const refreshToken = getCookie(event, REFRESH_COOKIE)
	if (refreshToken) {
		await User.updateOne(
			{ $or: [{ "refreshTokens.token": refreshToken }, { refreshToken }] },
			{
				$pull: { refreshTokens: { token: refreshToken } },
				$unset: { refreshToken: "", refreshTokenExpiresAt: "" },
			},
		)
	}
	const sessionToken = getCookie(event, SESSION_COOKIE)
	if (sessionToken) {
		const Session = getSessionModel(getSessionTtl(event))
		await Session.deleteOne({ token: sessionToken })
	}
	deleteCookie(event, REFRESH_COOKIE, { path: "/", sameSite: "lax", secure: !import.meta.dev })
	deleteCookie(event, SESSION_COOKIE, { path: "/", sameSite: "lax", secure: !import.meta.dev })
	return { success: true }
})
