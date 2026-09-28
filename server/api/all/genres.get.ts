import { Genre } from "../../models/genre"
import { requireAuthenticatedUser } from "../../utils/auth"

export default defineEventHandler(async (event) => {
	await requireAuthenticatedUser(event)

	return Genre.find({})
})
