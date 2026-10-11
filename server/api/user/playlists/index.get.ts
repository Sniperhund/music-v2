import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "#server/utils/auth"
import { Playlist } from "#server/models/playlist"
import { populatePlaylistTracks } from "#server/utils/playlists"

export default defineAuthenticatedEventHandler(async (event) => {
	const user = await requireAuthenticatedUser(event)
	const playlists = await Playlist.find({ owner: user._id }).sort({ createdAt: 1 })
	return await Promise.all(playlists.map((playlist: any) => populatePlaylistTracks(playlist)))
})
