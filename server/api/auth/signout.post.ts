import { deleteCookie } from "h3"
import { REFRESH_COOKIE, SESSION_COOKIE } from "../../utils/auth"

export default defineEventHandler((event) => {
	deleteCookie(event, REFRESH_COOKIE, { path: "/", sameSite: "lax", secure: !import.meta.dev })
	deleteCookie(event, SESSION_COOKIE, { path: "/", sameSite: "lax", secure: !import.meta.dev })
	return { success: true }
})
