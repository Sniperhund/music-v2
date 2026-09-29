import { getQuery } from "h3"
import { Artist } from "../../models/artist"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../utils/auth"
import { parseMongoIds, validationResponse } from "../../utils/api-validation"

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event)

	const parsedIds = parseMongoIds(getQuery(event).ids)
	if ("error" in parsedIds) return validationResponse(event, parsedIds.error)

	return Artist.find({ _id: { $in: parsedIds.value } }).exec()
})
