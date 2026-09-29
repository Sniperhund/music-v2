import { readBody, setResponseStatus } from "h3"
import { Genre } from "../../models/genre"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../utils/auth"

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event, true)

	const body = await readBody<unknown>(event)
	if (!body || typeof body !== "object" || Array.isArray(body)) {
		setResponseStatus(event, 400)
		const received = body === null ? "null" : Array.isArray(body) ? "array" : typeof body
		return { message: `Expected object, received ${received}` }
	}

	const name = (body as { name?: unknown }).name
	if (typeof name !== "string") {
		setResponseStatus(event, 400)
		return { message: name === undefined ? "Required" : `Expected string, received ${name === null ? "null" : typeof name}` }
	}
	try {
		const genre = await Genre.create({ name })
		setResponseStatus(event, 201)
		return genre
	} catch (error) {
		setResponseStatus(event, 400)
		if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
			return { message: "Genre already exists" }
		}
		return { message: "Unknown error" }
	}
})
