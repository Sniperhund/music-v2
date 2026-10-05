import { readAdminForm, adminFormText, adminFormTexts, adminFormFile, safeFileExtension, splitIds } from "../../utils/admin-form"
import { putObjects, tryDeleteObject } from "../../utils/object-storage"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../utils/auth"
import { Album } from "../../models/album"
import mongoose from "mongoose"

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event, true, { allowBearer: true, skipOriginCheck: true })
	const parts = await readAdminForm(event)
	const name = adminFormText(parts, "name")
	const artistInput = adminFormTexts(parts, "artists")
	const artists = artistInput.length ? splitIds(artistInput.join(",")) : undefined
	const genre = adminFormText(parts, "genre")
	const file = adminFormFile(parts, "file")
	if (name === undefined || !artists || !genre || !file) {
		setResponseStatus(event, 400)
		return { message: "Required" }
	}
	if (!mongoose.isValidObjectId(genre)) {
		setResponseStatus(event, 400)
		return { message: "Invalid id" }
	}
	if (!artists.every((id) => mongoose.isValidObjectId(id))) {
		setResponseStatus(event, 400)
		return { message: "One or more ID(s) are invalid" }
	}
	if (!file.type.includes("image/")) {
		setResponseStatus(event, 400)
		return { message: "Only image files are accepted" }
	}

	const filePath = `album/${crypto.randomUUID()}.${safeFileExtension(file.name)}`
	await putObjects(event, [{ key: filePath, body: file.data, contentType: file.type }])
	let album
	try {
		album = await Album.create({ name, artists, file: filePath, genre })
	} catch (error) {
		await tryDeleteObject(event, filePath)
		throw error
	}
	setResponseStatus(event, 201)
	return album
})
