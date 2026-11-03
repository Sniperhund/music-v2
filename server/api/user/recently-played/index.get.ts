import { User } from "#server/models/user"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "#server/utils/auth"
import { addAlbumTrackVerificationSummary } from "#server/utils/album-track-verification"

export default defineAuthenticatedEventHandler(async (event) => {
	const authenticatedUser = await requireAuthenticatedUser(event)
	const user = await User.findById(authenticatedUser._id).select("recentlyPlayedAlbums").populate({
		path: "recentlyPlayedAlbums",
		populate: [{ path: "artists" }, { path: "genre" }],
	})

	const albums = user?.recentlyPlayedAlbums?.filter((album: unknown) => album != null) ?? []
	return addAlbumTrackVerificationSummary(albums as any[])
})
