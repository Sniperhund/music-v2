import mongoose from "mongoose"
import { setResponseStatus, type H3Event } from "h3"

export type ParseResult<T> = { value: T } | { error: string }
export const MAX_QUERY_LIMIT = 100
export const MAX_QUERY_OFFSET = 1_000_000

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
	maximum = MAX_QUERY_OFFSET,
): ParseResult<number> {
	if (value === undefined) return { value: defaultValue }

	if (typeof value !== "string" || value.trim() === "") {
		return { error: "Expected integer, received invalid value" }
	}
	const parsed = Number(value)
	if (!Number.isSafeInteger(parsed)) {
		return { error: "Expected a safe integer" }
	}
	if (parsed < minimum) {
		return { error: `Number must be greater than or equal to ${minimum}` }
	}
	if (parsed > maximum) {
		return { error: `Number must be less than or equal to ${maximum}` }
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
