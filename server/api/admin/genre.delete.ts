import { getQuery, setResponseStatus } from "h3"
import { Album } from "../../models/album"
import { Genre } from "../../models/genre"
import { requireAuthenticatedUser } from "../../utils/auth"
import { parseMongoId } from "../../utils/api-validation"

export default defineEventHandler(async (event) => {
	await requireAuthenticatedUser(event, true)

	const query = getQuery(event)
	const parsedId = parseMongoId(query.id)
	if ("error" in parsedId) {
		setResponseStatus(event, 400)
		return { message: parsedId.error }
	}
	if (query.force !== "true" && query.force !== "false") {
		setResponseStatus(event, 400)
		return { message: query.force === undefined ? "Required" : "Expected boolean, received string" }
	}
	const force = query.force === "true"

	const genre = await Genre.findById(parsedId.value)
	if (!genre) {
		setResponseStatus(event, 404)
		return { message: "Genre not found" }
	}

	const dependents = await Album.find({ genre: genre._id }).select("_id name")
	if (force) {
		await Promise.all(dependents.map((dependent) => Album.findByIdAndDelete(dependent._id)))
	} else if (dependents.length) {
		setResponseStatus(event, 409)
		return {
			message: "Genre has one or more dependents",
			dependentType: "Album",
			dependents,
		}
	}

	await Genre.findByIdAndDelete(parsedId.value)
	return {}
})
