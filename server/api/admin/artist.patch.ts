import { getQuery, setResponseStatus } from "h3"
import mongoose from "mongoose"
import { readAdminForm, adminFormText, adminFormFile, safeFileExtension } from "../../utils/admin-form"
import { saveUploadFile, tryCleanUploadFileOrDirectory } from "../../utils/upload-files"
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
		void tryCleanUploadFileOrDirectory(event, artist.file)
		const filePath = `artists/${crypto.randomUUID()}.${safeFileExtension(file.name)}`
		await saveUploadFile(event, filePath, file.data)
		artist.file = filePath
	}
	if (name) artist.name = name
	await artist.save()
	return artist
})
