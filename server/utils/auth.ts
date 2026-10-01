import type { H3Event } from "h3"
import {
	createError,
	defineEventHandler,
	getCookie,
	getRequestHeader,
	getRequestURL,
	setResponseStatus,
	type EventHandler,
} from "h3"
import parseDuration from "parse-duration"
import mongoose from "mongoose"
import { getSessionModel } from "../models/session"
import { getBackendRuntimeConfig } from "./backend-config"

export const SESSION_COOKIE = "musicSession"
export const REFRESH_COOKIE = "refreshToken"
const INVALID_REQUEST_ORIGIN = "Invalid request origin"

/**
 * Keep the legacy API's direct authentication response body while leaving all
 * unrelated H3 errors to Nitro's normal error handler.
 */
export function defineAuthenticatedEventHandler(handler: EventHandler) {
	return defineEventHandler(async (event) => {
		try {
			return await handler(event)
		} catch (error) {
			const statusCode = (error as { statusCode?: number } | undefined)?.statusCode
			const statusMessage = (error as { statusMessage?: string } | undefined)?.statusMessage
			const message = (error as { data?: { message?: string } } | undefined)?.data?.message

			if (statusCode === 401 && statusMessage === "Unauthorized" && message === "Unauthorized") {
				setResponseStatus(event, 401)
				return { message: "Unauthorized" }
			}

			if (statusCode === 403 && statusMessage === "Forbidden" && message === INVALID_REQUEST_ORIGIN) {
				setResponseStatus(event, 403)
				return { message: INVALID_REQUEST_ORIGIN }
			}

			throw error
		}
	})
}

export function assertCookieRequestOrigin(event: H3Event) {
	const originHeader = getRequestHeader(event, "origin")
	const refererHeader = getRequestHeader(event, "referer")
	let requestOrigin: string | undefined
	let suppliedOrigin: string | undefined

	try {
		// H3 uses Host for the request host. A trusted ingress may provide
		// x-forwarded-proto; it must overwrite that header before this app.
		requestOrigin = getRequestURL(event, { xForwardedProto: true }).origin
		if (originHeader !== undefined) {
			const parsedOrigin = new URL(originHeader)
			if (parsedOrigin.origin === originHeader) suppliedOrigin = parsedOrigin.origin
		} else if (refererHeader !== undefined) {
			suppliedOrigin = new URL(refererHeader).origin
		}
	} catch {
		// Invalid or absent browser origin proof is rejected below.
	}

	if (!suppliedOrigin || !requestOrigin || suppliedOrigin !== requestOrigin) {
		throw createError({
			statusCode: 403,
			statusMessage: "Forbidden",
			data: { message: INVALID_REQUEST_ORIGIN },
		})
	}
}

export function getSessionTtl(event?: H3Event) {
	const { tokenExpire } = getBackendRuntimeConfig(event)
	return parseDuration(tokenExpire) || 60 * 60 * 1000
}

export async function findSession(event: H3Event) {
	const Session = getSessionModel(getSessionTtl(event)) as mongoose.Model<any>
	const token = getCookie(event, SESSION_COOKIE)
	if (!token) return null

	const session = await Session.findOne({ token })
		.populate("userId", "+verified")
		.exec()
	const user = session?.userId as unknown as
		| { _id: unknown; verified?: boolean; role?: string }
		| undefined

	return session && user ? { session, user } : null
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

	const method = event.node.req.method?.toUpperCase() || "GET"
	const isUnsafeMethod = !["GET", "HEAD", "OPTIONS"].includes(method)
	if (isUnsafeMethod) assertCookieRequestOrigin(event)

	return auth.user
}
