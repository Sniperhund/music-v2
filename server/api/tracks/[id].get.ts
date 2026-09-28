import { getRouterParam } from "h3"
import { Track } from "../../models/track"
import { requireAuthenticatedUser } from "../../utils/auth"
import { parseMongoId, validationResponse } from "../../utils/api-validation"

export default defineEventHandler(async (event) => {
	await requireAuthenticatedUser(event)

	const parsedId = parseMongoId(getRouterParam(event, "id"))
	if ("error" in parsedId) return validationResponse(event, parsedId.error)

	return Track.findOne({ _id: parsedId.value })
		.populate({
			path: "album",
			select: "-artists",
			populate: { path: "genre" },
		})
		.populate("artists")
		.exec()
})
