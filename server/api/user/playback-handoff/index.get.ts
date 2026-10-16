import { PlaybackHandoff } from "#server/models/playback-handoff"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "#server/utils/auth"

export default defineAuthenticatedEventHandler(async (event) => {
	const user = await requireAuthenticatedUser(event, false, { allowBearer: true, skipOriginCheck: true })
	const handoff = await PlaybackHandoff.findOne({ userId: user._id, expiresAt: { $gt: new Date() } })
		.select("-userId -_id -__v")
		.lean()
	return handoff ?? null
})
