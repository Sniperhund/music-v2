import { getQuery, setResponseStatus } from "h3"
import { User } from "#server/models/user"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "#server/utils/auth"
import { parseMongoId, validationResponse } from "#server/utils/api-validation"

export default defineAuthenticatedEventHandler(async (event) => {
	const authenticatedUser = await requireAuthenticatedUser(event)
	const parsedId = parseMongoId(getQuery(event).id)
	if ("error" in parsedId) return validationResponse(event, parsedId.error)

	const user = await User.findById(authenticatedUser._id).select("savedTracks")
	if (!user) {
		setResponseStatus(event, 404)
		return { message: "User not found" }
	}

	return {
		contains: user.savedTracks.some(
			(savedTrack: { toString(): string }) => savedTrack.toString() === parsedId.value,
		),
	}
})
