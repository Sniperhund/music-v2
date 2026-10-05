import { User } from "#server/models/user"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "#server/utils/auth"
import { setResponseStatus } from "h3"

export default defineAuthenticatedEventHandler(async (event) => {
	const authenticatedUser = await requireAuthenticatedUser(event)
	const user = await User.findById(authenticatedUser._id).populate({
		path: "savedTracks",
		populate: [
			{ path: "artists" },
			{ path: "album", populate: { path: "artists" } },
		],
	})

	if (!user) {
		setResponseStatus(event, 404)
		return { message: "User not found" }
	}

	return user.savedTracks.filter((track: unknown) => track != null)
})
