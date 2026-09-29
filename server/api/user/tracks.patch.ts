import { getQuery, setResponseStatus } from "h3"
import mongoose, { type ObjectId } from "mongoose"
import { User } from "../../models/user"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../utils/auth"
import { parseMongoId, validationResponse } from "../../utils/api-validation"

export default defineAuthenticatedEventHandler(async (event) => {
	const authenticatedUser = await requireAuthenticatedUser(event)
	const parsedId = parseMongoId(getQuery(event).id)
	if ("error" in parsedId) return validationResponse(event, parsedId.error)

	const user = await User.findById(authenticatedUser._id)
	if (!user) {
		setResponseStatus(event, 404)
		return { message: "User not found" }
	}

	// Preserve the legacy comparison behavior and empty-object response.
	if ((user.savedTracks as ObjectId[]).includes(parsedId.value as unknown as ObjectId)) {
		return {}
	}

	user.savedTracks.push(new mongoose.Types.ObjectId(parsedId.value))
	await user.save()
	return {}
})
