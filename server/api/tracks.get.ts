import { getQuery } from "h3"
import { Track } from "../models/track"
import { requireAuthenticatedUser } from "../utils/auth"
import { parseMongoIds, validationResponse } from "../utils/api-validation"

export default defineEventHandler(async (event) => {
	await requireAuthenticatedUser(event)

	const parsedIds = parseMongoIds(getQuery(event).ids)
	if ("error" in parsedIds) return validationResponse(event, parsedIds.error)

	return Track.find({ _id: { $in: parsedIds.value } })
		.populate({
			path: "album",
			select: "-artists",
			populate: { path: "genre" },
		})
		.populate("artists")
		.exec()
})
