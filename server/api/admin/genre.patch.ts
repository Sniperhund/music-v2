import { getQuery, readBody, setResponseStatus } from "h3"
import { Genre } from "../../models/genre"
import { requireAuthenticatedUser } from "../../utils/auth"
import { parseMongoId } from "../../utils/api-validation"

export default defineEventHandler(async (event) => {
	await requireAuthenticatedUser(event, true)

	const parsedId = parseMongoId(getQuery(event).id)
	if ("error" in parsedId) {
		setResponseStatus(event, 400)
		return { message: parsedId.error }
	}

	const body = await readBody<unknown>(event)
	if (!body || typeof body !== "object" || Array.isArray(body)) {
		setResponseStatus(event, 400)
		const received = body === null ? "null" : Array.isArray(body) ? "array" : typeof body
		return { message: `Expected object, received ${received}` }
	}

	const record = body as Record<string, unknown>
	if (record.name !== undefined && typeof record.name !== "string") {
		setResponseStatus(event, 400)
		return { message: `Expected string, received ${record.name === null ? "null" : typeof record.name}` }
	}

	const genre = await Genre.findByIdAndUpdate(parsedId.value, record.name === undefined ? {} : { name: record.name }, { new: true })
	if (!genre) {
		setResponseStatus(event, 404)
		return { message: "Genre not found" }
	}
	return genre
})
