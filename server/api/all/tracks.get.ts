import { Track } from "../../models/track"
import { requireAuthenticatedUser } from "../../utils/auth"

export default defineEventHandler(async (event) => {
	await requireAuthenticatedUser(event)

	return Track.find({})
		.populate({
			path: "album",
			select: "-artists",
			populate: { path: "genre" },
		})
		.populate("artists")
})
