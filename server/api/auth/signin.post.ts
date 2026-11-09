import { randomUUID } from "node:crypto"
import { readBody, setCookie, setResponseStatus } from "h3"
import argon2 from "argon2"
import { User } from "../../models/user"
import {
	assertCookieRequestOrigin,
	defineAuthenticatedEventHandler,
	REFRESH_COOKIE,
} from "../../utils/auth"
import { createRefreshTokenRecord, MAX_REFRESH_TOKENS_PER_USER } from "../../utils/refresh-tokens"
import { getAuthValidationMessage } from "../../utils/auth-validation"
import {
	clearSignInFailures,
	isSignInRateLimited,
	recordSignInFailure,
} from "../../utils/sign-in-rate-limit"

export default defineAuthenticatedEventHandler(async (event) => {
	assertCookieRequestOrigin(event)
	if (isSignInRateLimited(event)) {
		setResponseStatus(event, 429)
		return { message: "Too many sign-in attempts. Try again later." }
	}

	const body = await readBody(event)
	const validationMessage = getAuthValidationMessage(body, [
		{ name: "email", email: true },
		{ name: "password", minimumLength: 8 },
	])
	if (validationMessage) {
		setResponseStatus(event, 400)
		return { message: validationMessage }
	}

	const user = await User.findOne({ email: body.email.toLowerCase() }).select(
		"+passwordHash +refreshTokens +refreshToken +refreshTokenExpiresAt",
	)
	let passwordMatches = false
	if (user) {
		try {
			// Bun.password's default output is PHC Argon2id and argon2 verifies
			// its encoded algorithm and parameters directly.
			passwordMatches = await argon2.verify(user.passwordHash, body.password)
		} catch {
			// Malformed or unsupported stored hashes must not reveal account state.
		}
	}

	if (!user || !passwordMatches) {
		recordSignInFailure(event)
		setResponseStatus(event, 400)
		return { message: "The email or password is wrong" }
	}

	clearSignInFailures(event)
	const refreshToken = randomUUID()
	const record = createRefreshTokenRecord(refreshToken)
	const records = [record]
	if (
		user.refreshToken &&
		user.refreshTokenExpiresAt &&
		user.refreshTokenExpiresAt.getTime() > Date.now()
	) {
		records.push({
			token: user.refreshToken,
			expiresAt: user.refreshTokenExpiresAt,
			createdAt: user.updatedAt ?? new Date(),
		})
	}
	await User.updateOne(
		{ _id: user._id },
		{ $pull: { refreshTokens: { expiresAt: { $lte: new Date() } } } },
	)
	await User.updateOne(
		{ _id: user._id },
		{
			$push: {
				refreshTokens: {
					$each: records,
					$sort: { createdAt: -1 },
					$slice: MAX_REFRESH_TOKENS_PER_USER,
				},
			},
			$unset: { refreshToken: "", refreshTokenExpiresAt: "" },
		},
	)
	setCookie(event, REFRESH_COOKIE, refreshToken, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: !import.meta.dev,
		maxAge: 60 * 60 * 24 * 30,
	})
	setResponseStatus(event, 200)
	// The long-lived refresh token is deliberately omitted from the JSON body.
	return {}
})
