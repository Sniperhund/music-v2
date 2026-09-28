import mongoose from "mongoose"
import { setResponseStatus, type H3Event } from "h3"

export type ParseResult<T> = { value: T } | { error: string }

export function parseMongoId(value: unknown): ParseResult<string> {
	if (typeof value !== "string" || !mongoose.isValidObjectId(value)) {
		return { error: "Invalid id" }
	}
	return { value }
}

export function parseMongoIds(value: unknown): ParseResult<string[]> {
	if (typeof value !== "string" && !Array.isArray(value)) {
		return { error: "Required" }
	}

	const values = Array.isArray(value) ? value : [value]
	const ids: string[] = []
	for (const item of values) {
		const parsed = parseMongoId(item)
		if ("error" in parsed) return parsed
		ids.push(parsed.value)
	}
	return { value: ids }
}

export function parseNumber(
	value: unknown,
	defaultValue: number,
	minimum: number,
): ParseResult<number> {
	if (value === undefined) return { value: defaultValue }

	const parsed = Number(value)
	if (Number.isNaN(parsed)) return { error: "Expected number, received nan" }
	if (parsed < minimum) {
		return { error: `Number must be greater than or equal to ${minimum}` }
	}
	return { value: parsed }
}

export function parseQueryString(value: unknown): ParseResult<string> {
	if (value === undefined) return { error: "Required" }
	if (typeof value !== "string") return { error: "Expected string, received array" }
	return { value }
}

export function validationResponse(event: H3Event, message: string) {
	setResponseStatus(event, 400)
	return { message }
}
