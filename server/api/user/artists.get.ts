import { setResponseStatus } from "h3"
import { Artist } from "#server/models/artist"
import { Track } from "#server/models/track"
import { User } from "#server/models/user"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "#server/utils/auth"

export default defineAuthenticatedEventHandler(async (event) => {
	const authenticatedUser = await requireAuthenticatedUser(event)
	const user = await User.findById(authenticatedUser._id).select("savedTracks")
	if (!user) {
		setResponseStatus(event, 404)
		return { message: "User not found" }
	}

	if (!user.savedTracks.length) return []

	const tracks = await Track.find({ _id: { $in: user.savedTracks } })
		.select("_id artists")
		.exec()
	const artistsByTrack = new Map(
		tracks.map((track: any) => [
			track._id.toString(),
			(track.artists ?? []).map((artist: any) => artist.toString()),
		]),
	)
	const artistIds: string[] = []
	const seen = new Set<string>()
	for (const savedTrack of user.savedTracks) {
		for (const artistId of artistsByTrack.get(savedTrack.toString()) ?? []) {
			if (!seen.has(artistId)) {
				seen.add(artistId)
				artistIds.push(artistId)
			}
		}
	}
	if (!artistIds.length) return []

	const artists = await Artist.find({ _id: { $in: artistIds } }).exec()
	const artistsById = new Map(artists.map((artist: any) => [artist._id.toString(), artist]))
	return artistIds.map((id) => artistsById.get(id)).filter((artist) => artist != null)
})
