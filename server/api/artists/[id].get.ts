import { getRouterParam } from "h3"
import { Artist } from "../../models/artist"
import { requireAuthenticatedUser } from "../../utils/auth"
import { parseMongoId, validationResponse } from "../../utils/api-validation"

export default defineEventHandler(async (event) => {
	await requireAuthenticatedUser(event)

	const parsedId = parseMongoId(getRouterParam(event, "id"))
	if ("error" in parsedId) return validationResponse(event, parsedId.error)

	return Artist.findOne({ _id: parsedId.value }).exec()
})
