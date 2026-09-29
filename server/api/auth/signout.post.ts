import { deleteCookie } from "h3"
import {
	assertCookieRequestOrigin,
	defineAuthenticatedEventHandler,
	REFRESH_COOKIE,
	SESSION_COOKIE,
} from "../../utils/auth"

export default defineAuthenticatedEventHandler((event) => {
	assertCookieRequestOrigin(event)
	deleteCookie(event, REFRESH_COOKIE, { path: "/", sameSite: "lax", secure: !import.meta.dev })
	deleteCookie(event, SESSION_COOKIE, { path: "/", sameSite: "lax", secure: !import.meta.dev })
	return { success: true }
})
