import type { H3Event } from "h3"
import { createError, getCookie } from "h3"
import parseDuration from "parse-duration"
import mongoose from "mongoose"
import { getSessionModel } from "../models/session"
import { getBackendRuntimeConfig } from "./backend-config"

export const SESSION_COOKIE = "musicSession"
export const REFRESH_COOKIE = "refreshToken"

export function getSessionTtl(event?: H3Event) {
	const { tokenExpire } = getBackendRuntimeConfig(event)
	return parseDuration(tokenExpire) || 60 * 60 * 1000
}

function getSessionTokens(event: H3Event) {
	const tokens: string[] = []
	const cookieToken = getCookie(event, SESSION_COOKIE)
	const authorization = event.node.req.headers.authorization
	const bearerToken = authorization?.startsWith("Bearer ")
		? authorization.slice("Bearer ".length)
		: undefined

	if (cookieToken) tokens.push(cookieToken)
	if (bearerToken && bearerToken !== cookieToken) tokens.push(bearerToken)

	return tokens
}

export async function findSession(event: H3Event) {
	const Session = getSessionModel(getSessionTtl(event)) as mongoose.Model<any>

	for (const token of getSessionTokens(event)) {
		const session = await Session.findOne({ token })
			.populate("userId", "+verified")
			.exec()

		const user = session?.userId as unknown as
			| { _id: unknown; verified?: boolean; role?: string }
			| undefined

		if (!session || !user) continue

		return { session, user }
	}

	return null
}

export async function findAuthenticatedSession(event: H3Event, adminOnly = false) {
	const auth = await findSession(event)
	if (!auth?.user.verified || (adminOnly && auth.user.role !== "admin")) return null
	return auth
}

export async function requireAuthenticatedUser(event: H3Event, adminOnly = false) {
	const auth = await findAuthenticatedSession(event, adminOnly)
	if (!auth) {
		throw createError({
			statusCode: 401,
			statusMessage: "Unauthorized",
			data: { message: "Unauthorized" },
		})
	}

	return auth.user
}
