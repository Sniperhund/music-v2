import { getQuery } from "h3"
import { Album } from "../../models/album"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../utils/auth"
import { parseMongoIds, validationResponse } from "../../utils/api-validation"

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event)

	const parsedIds = parseMongoIds(getQuery(event).ids)
	if ("error" in parsedIds) return validationResponse(event, parsedIds.error)

	return Album.find({ _id: { $in: parsedIds.value } })
		.populate("artists")
		.populate("genre")
		.exec()
})
