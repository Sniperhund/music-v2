import mongoose from "mongoose"
import { readBody } from "h3"
import { PlaybackEvent } from "#server/models/playback-event"
import { Track } from "#server/models/track"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "#server/utils/auth"
import { validationResponse } from "#server/utils/api-validation"

export default defineAuthenticatedEventHandler(async (event) => {
	const user = await requireAuthenticatedUser(event)
	const body = await readBody(event)
	if (
		!body ||
		typeof body.sessionId !== "string" ||
		body.sessionId.length < 1 ||
		body.sessionId.length > 100 ||
		typeof body.trackId !== "string" ||
		!mongoose.isValidObjectId(body.trackId) ||
		!Number.isFinite(body.listenedSeconds) ||
		body.listenedSeconds <= 0 ||
		(body.completed !== undefined && typeof body.completed !== "boolean") ||
		typeof body.startedAt !== "string" ||
		!Number.isFinite(Date.parse(body.startedAt))
	) return validationResponse(event, "Invalid playback event")

	const track = await Track.findById(body.trackId).select("durationInSeconds")
	if (!track) return validationResponse(event, "Track does not exist")
	if (body.listenedSeconds > track.durationInSeconds) {
		return validationResponse(event, "Listened time exceeds track duration")
	}
	const minimumListenedSeconds = Math.min(30, track.durationInSeconds * 0.3)
	const existingEvent = await PlaybackEvent.exists({
		userId: user._id,
		sessionId: body.sessionId,
		trackId: track._id,
	})
	if (!existingEvent && !body.completed && body.listenedSeconds < minimumListenedSeconds) {
		return validationResponse(event, "Playback event does not meet the listening threshold")
	}

	const update: Record<string, unknown> = {
		$max: { listenedSeconds: body.listenedSeconds },
		$setOnInsert: {
			userId: user._id,
			sessionId: body.sessionId,
			trackId: track._id,
			startedAt: new Date(body.startedAt),
		},
	}
	if (body.completed === true) update.$set = { completed: true }
	else update.$setOnInsert = { ...update.$setOnInsert as Record<string, unknown>, completed: false }
	await PlaybackEvent.updateOne(
		{ userId: user._id, sessionId: body.sessionId, trackId: track._id },
		update,
		{ upsert: true },
	)
	return { saved: true }
})
