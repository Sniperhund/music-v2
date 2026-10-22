import { User } from "#server/models/user"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "#server/utils/auth"

export default defineAuthenticatedEventHandler(async (event) => {
	const authenticatedUser = await requireAuthenticatedUser(event)
	const user = await User.findById(authenticatedUser._id).select("recentlyPlayedAlbums").populate({
		path: "recentlyPlayedAlbums",
		populate: [{ path: "artists" }, { path: "genre" }],
	})

	return user?.recentlyPlayedAlbums?.filter((album: unknown) => album != null) ?? []
})
