import { getQuery, getRouterParam } from "h3"
import { Track } from "../../../models/track"
import { requireAuthenticatedUser } from "../../../utils/auth"
import { parseMongoId, parseNumber, validationResponse } from "../../../utils/api-validation"

export default defineEventHandler(async (event) => {
	await requireAuthenticatedUser(event)

	const parsedId = parseMongoId(getRouterParam(event, "id"))
	if ("error" in parsedId) return validationResponse(event, parsedId.error)

	const query = getQuery(event)
	const limit = parseNumber(query.limit, 9, 1)
	if ("error" in limit) return validationResponse(event, limit.error)
	const skip = parseNumber(query.skip, 0, 0)
	if ("error" in skip) return validationResponse(event, skip.error)

	return Track.find({ album: parsedId.value })
		.limit(limit.value || 9)
		.skip(skip.value || 0)
		.populate("artists")
		.populate({ path: "album", select: "-artists -genre" })
		.exec()
})
