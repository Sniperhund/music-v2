import { Album } from "../../models/album"
import { requireAuthenticatedUser } from "../../utils/auth"

export default defineEventHandler(async (event) => {
	await requireAuthenticatedUser(event)

	return Album.find({}).populate("artists").populate("genre")
})
