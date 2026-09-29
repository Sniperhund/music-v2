import { getQuery, setResponseStatus } from "h3"
import mongoose from "mongoose"
import { readAdminForm, adminFormText, adminFormFile, safeFileExtension } from "../../utils/admin-form"
import { putObjects, tryDeleteObject } from "../../utils/object-storage"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../utils/auth"
import { parseMongoId, validationResponse } from "../../utils/api-validation"
import { Artist } from "../../models/artist"

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event, true)
	const parsedId = parseMongoId(getQuery(event).id)
	if ("error" in parsedId) return validationResponse(event, parsedId.error)
	const parts = await readAdminForm(event)
	const name = adminFormText(parts, "name")
	const file = adminFormFile(parts, "file")
	if (file && !file.type.includes("image/")) {
		setResponseStatus(event, 400)
		return { message: "Only image files are accepted" }
	}

	const artist = await Artist.findById(parsedId.value)
	if (!artist) {
		setResponseStatus(event, 404)
		return {}
	}
	if (file) {
		const filePath = `artists/${crypto.randomUUID()}.${safeFileExtension(file.name)}`
		await putObjects(event, [{ key: filePath, body: file.data, contentType: file.type }])
		const previousPath = artist.file
		artist.file = filePath
		if (name) artist.name = name
		try {
			await artist.save()
		} catch (error) {
			await tryDeleteObject(event, filePath)
			throw error
		}
		await tryDeleteObject(event, previousPath)
		return artist
	}
	if (name) artist.name = name
	await artist.save()
	return artist
})
