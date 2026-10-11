import { readBody, setResponseStatus } from "h3"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "#server/utils/auth"
import { Playlist } from "#server/models/playlist"
import { parsePlaylistName } from "#server/utils/playlists"

export default defineAuthenticatedEventHandler(async (event) => {
	const user = await requireAuthenticatedUser(event)
	const body = await readBody<unknown>(event)
	const name = parsePlaylistName((body as any)?.name)
	if (!name) {
		setResponseStatus(event, 400)
		return { message: "Name must be between 1 and 100 characters" }
	}
	const playlist = await Playlist.create({ owner: user._id, name, tracks: [] })
	setResponseStatus(event, 201)
	return playlist
})
