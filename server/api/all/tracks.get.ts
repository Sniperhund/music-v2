import { Track } from "../../models/track"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../utils/auth"

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event)

	return Track.find({})
		.populate({
			path: "album",
			select: "-artists",
			populate: { path: "genre" },
		})
		.populate("artists")
})
