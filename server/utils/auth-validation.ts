type AuthField = {
	name: string
	email?: boolean
	minimumLength?: number
}

function receivedType(value: unknown) {
	if (value === null) return "null"
	if (Array.isArray(value)) return "array"
	return typeof value
}

/** Match the first-issue messages returned by the legacy Zod validation hook. */
export function getAuthValidationMessage(body: unknown, fields: AuthField[]) {
	if (!body || typeof body !== "object" || Array.isArray(body)) {
		return body === undefined ? "Required" : `Expected object, received ${receivedType(body)}`
	}

	for (const field of fields) {
		const value = (body as Record<string, unknown>)[field.name]
		if (typeof value !== "string") {
			return value === undefined
				? "Required"
				: `Expected string, received ${receivedType(value)}`
		}

		if (
			field.email &&
			!/^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i.test(
				value,
			)
		) {
			return "Invalid email"
		}

		if (field.minimumLength && value.length < field.minimumLength) {
			return `String must contain at least ${field.minimumLength} character(s)`
		}
	}

	return null
}
