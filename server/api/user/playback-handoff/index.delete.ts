import { PlaybackHandoff } from "#server/models/playback-handoff"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "#server/utils/auth"

export default defineAuthenticatedEventHandler(async (event) => {
	const user = await requireAuthenticatedUser(event, false, { allowBearer: true, skipOriginCheck: true })
	await PlaybackHandoff.deleteOne({ userId: user._id })
	return { deleted: true }
})
