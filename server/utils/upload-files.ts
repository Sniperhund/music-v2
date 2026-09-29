import type { MultiPartData } from "h3"

// Keep the established utility module path for Nitro's generated auto-imports.
// File persistence is handled by object-storage.ts.
export function getFormField(parts: MultiPartData[] | undefined, name: string) {
	return parts?.find((part) => part.name === name)
}

export function getFormFieldValues(parts: MultiPartData[] | undefined, name: string) {
	return parts?.filter((part) => part.name === name) ?? []
}

export function formFieldText(part: MultiPartData | undefined) {
	return part ? part.data.toString("utf8") : undefined
}

export function formFieldFile(part: MultiPartData | undefined) {
	if (!part?.filename) return undefined
	return { name: part.filename, type: part.type ?? "", data: part.data }
}
