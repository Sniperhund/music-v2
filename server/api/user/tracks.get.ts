import { User } from "../../models/user"
import { requireAuthenticatedUser } from "../../utils/auth"
import { setResponseStatus } from "h3"

export default defineEventHandler(async (event) => {
	const authenticatedUser = await requireAuthenticatedUser(event)
	const user = await User.findById(authenticatedUser._id).populate("savedTracks")

	if (!user) {
		setResponseStatus(event, 404)
		return { message: "User not found" }
	}

	return user.savedTracks
})
