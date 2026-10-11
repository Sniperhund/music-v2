import { deleteCookie, getCookie } from "h3"
import { User } from "../../models/user"
import {
	assertCookieRequestOrigin,
	defineAuthenticatedEventHandler,
	REFRESH_COOKIE,
	SESSION_COOKIE,
} from "../../utils/auth"

export default defineAuthenticatedEventHandler(async (event) => {
	assertCookieRequestOrigin(event)
	const refreshToken = getCookie(event, REFRESH_COOKIE)
	if (refreshToken) {
		await User.updateOne(
			{ refreshToken },
			{ $set: { refreshTokenExpiresAt: new Date(0) } },
		)
	}
	deleteCookie(event, REFRESH_COOKIE, { path: "/", sameSite: "lax", secure: !import.meta.dev })
	deleteCookie(event, SESSION_COOKIE, { path: "/", sameSite: "lax", secure: !import.meta.dev })
	return { success: true }
})
