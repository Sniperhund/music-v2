import { readBody } from "h3"
import mongoose from "mongoose"
import { PlaybackHandoff } from "#server/models/playback-handoff"
import { Track } from "#server/models/track"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "#server/utils/auth"
import { validationResponse } from "#server/utils/api-validation"

const HANDOFF_TTL_MS = 5 * 60 * 1000

export default defineAuthenticatedEventHandler(async (event) => {
	const user = await requireAuthenticatedUser(event, false, { allowBearer: true, skipOriginCheck: true })
	const body = await readBody(event)
	if (!body || !Array.isArray(body.queueTrackIds) || !Array.isArray(body.remainingTrackIds) || !Array.isArray(body.historyTrackIds))
		return validationResponse(event, "Invalid playback handoff")
	const ids = [body.currentTrackId, ...body.queueTrackIds, ...body.remainingTrackIds, ...body.historyTrackIds]
	if (ids.some((id) => !mongoose.isValidObjectId(id))) return validationResponse(event, "Invalid track id")
	if (!Number.isFinite(body.position) || body.position < 0 || typeof body.repeat !== "boolean" || typeof body.repeatOnce !== "boolean" || typeof body.wasPlaying !== "boolean")
		return validationResponse(event, "Invalid playback state")
	const uniqueIds = [...new Set(ids.map(String))]
	const existingCount = await Track.countDocuments({ _id: { $in: uniqueIds } })
	if (existingCount !== uniqueIds.length) return validationResponse(event, "One or more tracks do not exist")
	const now = new Date()
	await PlaybackHandoff.findOneAndUpdate(
		{ userId: user._id },
		{
			userId: user._id,
			currentTrackId: body.currentTrackId,
			position: body.position,
			queueTrackIds: body.queueTrackIds,
			remainingTrackIds: body.remainingTrackIds,
			historyTrackIds: body.historyTrackIds,
			repeat: body.repeat,
			repeatOnce: body.repeatOnce,
			wasPlaying: body.wasPlaying,
			updatedAt: now,
			expiresAt: new Date(now.getTime() + HANDOFF_TTL_MS),
		},
		{ upsert: true, new: true, setDefaultsOnInsert: true },
	)
	return { saved: true, expiresAt: new Date(now.getTime() + HANDOFF_TTL_MS) }
})
