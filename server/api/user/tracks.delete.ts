import { getQuery, setResponseStatus } from "h3"
import { User } from "#server/models/user"
import {
	defineAuthenticatedEventHandler,
	requireAuthenticatedUser,
} from "#server/utils/auth"
import { parseMongoIds, validationResponse } from "#server/utils/api-validation"

export default defineAuthenticatedEventHandler(async (event) => {
	const authenticatedUser = await requireAuthenticatedUser(event)
	const parsedIds = parseMongoIds(getQuery(event).ids ?? getQuery(event).id)
	if ("error" in parsedIds) return validationResponse(event, parsedIds.error)

	const user = await User.findById(authenticatedUser._id)
	if (!user) {
		setResponseStatus(event, 404)
		return { message: "User not found" }
	}

	user.savedTracks = user.savedTracks.filter(
		(savedTrack: { toString(): string }) =>
			!parsedIds.value.includes(savedTrack.toString()),
	)
	await user.save()
	return {}
})
