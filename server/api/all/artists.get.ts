import { Artist } from "../../models/artist"
import { requireAuthenticatedUser } from "../../utils/auth"

export default defineEventHandler(async (event) => {
	await requireAuthenticatedUser(event)

	return Artist.find({})
})
