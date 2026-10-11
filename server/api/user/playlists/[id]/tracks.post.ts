import mongoose from "mongoose"
import { getRouterParam, readBody, setResponseStatus } from "h3"
import { Playlist } from "#server/models/playlist"
import { Track } from "#server/models/track"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "#server/utils/auth"
import { parseMongoId, validationResponse } from "#server/utils/api-validation"
import { populatePlaylistTracks } from "#server/utils/playlists"

export default defineAuthenticatedEventHandler(async (event) => {
	const user = await requireAuthenticatedUser(event)
	const parsedPlaylistId = parseMongoId(getRouterParam(event, "id"))
	if ("error" in parsedPlaylistId) return validationResponse(event, parsedPlaylistId.error)
	const body = await readBody<unknown>(event)
	const parsedTrackId = parseMongoId((body as any)?.trackId)
	if ("error" in parsedTrackId) return validationResponse(event, "Invalid track id")
	const [playlist, track] = await Promise.all([
		Playlist.findOne({ _id: parsedPlaylistId.value, owner: user._id }),
		Track.exists({ _id: parsedTrackId.value }),
	])
	if (!playlist) {
		setResponseStatus(event, 404)
		return { message: "Playlist not found" }
	}
	if (!track) {
		setResponseStatus(event, 404)
		return { message: "Track not found" }
	}
	if (!(playlist.tracks as mongoose.Types.ObjectId[]).some((id) => id.toString() === parsedTrackId.value)) {
		playlist.tracks.push(new mongoose.Types.ObjectId(parsedTrackId.value))
		await playlist.save()
	}
	return await populatePlaylistTracks(playlist)
})
