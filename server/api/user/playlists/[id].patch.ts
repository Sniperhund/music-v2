import { getRouterParam, readBody, setResponseStatus } from "h3"
import { Playlist } from "#server/models/playlist"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "#server/utils/auth"
import { parseMongoId, validationResponse } from "#server/utils/api-validation"
import { parsePlaylistName } from "#server/utils/playlists"

export default defineAuthenticatedEventHandler(async (event) => {
	const user = await requireAuthenticatedUser(event)
	const parsedId = parseMongoId(getRouterParam(event, "id"))
	if ("error" in parsedId) return validationResponse(event, parsedId.error)
	const body = await readBody<unknown>(event)
	const name = parsePlaylistName((body as any)?.name)
	if (!name) {
		setResponseStatus(event, 400)
		return { message: "Name must be between 1 and 100 characters" }
	}
	const playlist = await Playlist.findOneAndUpdate(
		{ _id: parsedId.value, owner: user._id },
		{ $set: { name } },
		{ new: true, runValidators: true },
	)
	if (!playlist) {
		setResponseStatus(event, 404)
		return { message: "Playlist not found" }
	}
	return playlist
})
