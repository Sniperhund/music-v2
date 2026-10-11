import { getRouterParam, setResponseStatus } from "h3"
import { Playlist } from "#server/models/playlist"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "#server/utils/auth"
import { parseMongoId, validationResponse } from "#server/utils/api-validation"

export default defineAuthenticatedEventHandler(async (event) => {
	const user = await requireAuthenticatedUser(event)
	const parsedId = parseMongoId(getRouterParam(event, "id"))
	if ("error" in parsedId) return validationResponse(event, parsedId.error)
	const result = await Playlist.deleteOne({ _id: parsedId.value, owner: user._id })
	if (!result.deletedCount) {
		setResponseStatus(event, 404)
		return { message: "Playlist not found" }
	}
	return {}
})
