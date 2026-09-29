import { getQuery, setResponseStatus } from "h3"
import mongoose from "mongoose"
import { readAdminForm, adminFormText, adminFormTexts, adminFormFile, safeFileExtension, splitIds } from "../../utils/admin-form"
import { saveUploadFile, tryCleanUploadFileOrDirectory } from "../../utils/upload-files"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../utils/auth"
import { parseMongoId, validationResponse } from "../../utils/api-validation"
import { Album } from "../../models/album"

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event, true)
	const parsedId = parseMongoId(getQuery(event).id)
	if ("error" in parsedId) return validationResponse(event, parsedId.error)
	const parts = await readAdminForm(event)
	const name = adminFormText(parts, "name")
	const artistInput = adminFormTexts(parts, "artists")
	const artists = artistInput.length ? splitIds(artistInput.join(",")) : undefined
	const genre = adminFormText(parts, "genre")
	const file = adminFormFile(parts, "file")
	if (artists && !artists.every((id) => mongoose.isValidObjectId(id))) {
		setResponseStatus(event, 400)
		return { message: "One or more ID(s) are invalid" }
	}
	if (genre && !mongoose.isValidObjectId(genre)) return validationResponse(event, "Invalid id")
	if (file && !file.type.includes("image/")) {
		setResponseStatus(event, 400)
		return { message: "Only image files are accepted" }
	}

	const album = await Album.findById(parsedId.value)
	if (!album) {
		setResponseStatus(event, 404)
		return {}
	}
	if (file) {
		void tryCleanUploadFileOrDirectory(event, album.file)
		const filePath = `album/${crypto.randomUUID()}.${safeFileExtension(file.name)}`
		await saveUploadFile(event, filePath, file.data)
		album.file = filePath
	}
	if (name) album.name = name
	if (artists) album.artists = artists.map((id) => new mongoose.Types.ObjectId(id))
	if (genre) album.genre = new mongoose.Types.ObjectId(genre)
	await album.save()
	return album
})
