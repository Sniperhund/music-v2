import { User } from "../models/user"
import { REFRESH_TOKEN_TTL_MS } from "./auth-constants"

export const MAX_REFRESH_TOKENS_PER_USER = 10

export async function findUserByRefreshToken(token: string, select = "") {
	const user = await User.findOne({
		$or: [{ "refreshTokens.token": token }, { refreshToken: token }],
	}).select(`+refreshTokens +refreshToken +refreshTokenExpiresAt ${select}`)

	if (!user) return null
	const matchingToken = user.refreshTokens?.find((item: any) => item.token === token)
	if (matchingToken) {
		return matchingToken.expiresAt.getTime() > Date.now()
			? { user, expiresAt: matchingToken.expiresAt }
			: null
	}

	if (
		user.refreshToken !== token ||
		!user.refreshTokenExpiresAt ||
		user.refreshTokenExpiresAt.getTime() <= Date.now()
	) {
		return null
	}

	const expiresAt = user.refreshTokenExpiresAt
	await User.updateOne(
		{ _id: user._id, refreshToken: token },
		{
			$push: {
				refreshTokens: {
					$each: [
						{
							token,
							expiresAt,
							createdAt: user.updatedAt ?? new Date(),
						},
					],
					$sort: { createdAt: -1 },
					$slice: MAX_REFRESH_TOKENS_PER_USER,
				},
			},
			$unset: { refreshToken: "", refreshTokenExpiresAt: "" },
		},
	)
	return { user, expiresAt }
}

export function createRefreshTokenRecord(token: string) {
	const createdAt = new Date()
	return {
		token,
		createdAt,
		expiresAt: new Date(createdAt.getTime() + REFRESH_TOKEN_TTL_MS),
	}
}
