import { readMultipartFormData, type H3Event, type MultiPartData } from "h3"
import { formFieldText, getFormField, getFormFieldValues } from "./upload-files"

export async function readAdminForm(event: H3Event) {
	return (await readMultipartFormData(event)) ?? []
}

export function adminFormText(parts: MultiPartData[], key: string) {
	return formFieldText(getFormField(parts, key))
}

export function adminFormTexts(parts: MultiPartData[], key: string) {
	return getFormFieldValues(parts, key).map((part) => part.data.toString("utf8"))
}

export function adminFormFile(parts: MultiPartData[], key: string) {
	const part = getFormField(parts, key)
	if (!part?.filename) return undefined
	return { name: part.filename, type: part.type ?? "", data: part.data }
}

export function splitIds(value: string | undefined) {
	return value === undefined ? undefined : value.split(",").map((id) => id.trim()).filter(Boolean)
}

export function safeFileExtension(fileName: string) {
	if (!fileName.includes(".")) return ""
	return fileName.split(".").pop()?.replace(/[^A-Za-z0-9]/g, "") ?? ""
}

export function parseOptionalJson(value: string | undefined) {
	if (value === undefined) return { ok: true as const, value: undefined }
	try {
		return { ok: true as const, value: JSON.parse(value) as unknown }
	} catch {
		return { ok: false as const }
	}
}
