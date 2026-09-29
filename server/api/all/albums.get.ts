import { Album } from "../../models/album"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../utils/auth"

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event)

	return Album.find({}).populate("artists").populate("genre")
})
