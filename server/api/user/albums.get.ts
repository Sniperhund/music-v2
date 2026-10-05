import { setResponseStatus } from "h3"
import { User } from "#server/models/user"
import { Album } from "#server/models/album"
import { Track } from "#server/models/track"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "#server/utils/auth"

export default defineAuthenticatedEventHandler(async (event) => {
	const authenticatedUser = await requireAuthenticatedUser(event)
	const user = await User.findById(authenticatedUser._id).select("savedTracks")
	if (!user) {
		setResponseStatus(event, 404)
		return { message: "User not found" }
	}

	if (!user.savedTracks.length) return []

	const tracks = await Track.find({ _id: { $in: user.savedTracks } }).select("_id album").exec()
	const albumByTrack = new Map(tracks.map((track: any) => [track._id.toString(), track.album?.toString()]))
	const albumIds: string[] = []
	const seen = new Set<string>()
	for (const savedTrack of user.savedTracks) {
		const albumId = albumByTrack.get(savedTrack.toString())
		if (albumId && !seen.has(albumId)) {
			seen.add(albumId)
			albumIds.push(albumId)
		}
	}
	if (!albumIds.length) return []

	const albums = await Album.find({ _id: { $in: albumIds } }).populate("artists").populate("genre").exec()
	const albumsById = new Map(albums.map((album: any) => [album._id.toString(), album]))
	return albumIds.map((id) => albumsById.get(id)).filter((album) => album != null)
})
