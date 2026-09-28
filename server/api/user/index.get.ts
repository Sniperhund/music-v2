import { requireAuthenticatedUser } from "../../utils/auth"

export default defineEventHandler(async (event) => {
	return await requireAuthenticatedUser(event)
})
