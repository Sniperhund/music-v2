import { getQuery } from "h3"
import { Genre } from "../../models/genre"
import { MAX_QUERY_LIMIT, parseNumber, validationResponse } from "../../utils/api-validation"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../utils/auth"

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event)

	const { limit: rawLimit } = getQuery(event)
	const limit = parseNumber(rawLimit, 10, 1, MAX_QUERY_LIMIT)
	if ("error" in limit) return validationResponse(event, limit.error)

	const genres = await Genre.aggregate([{ $sample: { size: limit.value || 10 } }])
	return genres
})
