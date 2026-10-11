import { getQuery, getRouterParam, setResponseStatus } from "h3"
import { Playlist } from "#server/models/playlist"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "#server/utils/auth"
import { parseMongoId, validationResponse } from "#server/utils/api-validation"
import { populatePlaylistTracks } from "#server/utils/playlists"

export default defineAuthenticatedEventHandler(async (event) => {
	const user = await requireAuthenticatedUser(event)
	const parsedPlaylistId = parseMongoId(getRouterParam(event, "id"))
	if ("error" in parsedPlaylistId) return validationResponse(event, parsedPlaylistId.error)
	const parsedTrackId = parseMongoId(getQuery(event).trackId)
	if ("error" in parsedTrackId) return validationResponse(event, "Invalid track id")
	const playlist = await Playlist.findOne({ _id: parsedPlaylistId.value, owner: user._id })
	if (!playlist) {
		setResponseStatus(event, 404)
		return { message: "Playlist not found" }
	}
	playlist.tracks = playlist.tracks.filter((id: { toString(): string }) => id.toString() !== parsedTrackId.value)
	await playlist.save()
	return await populatePlaylistTracks(playlist)
})
