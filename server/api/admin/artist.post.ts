import { readAdminForm, adminFormText, adminFormFile, safeFileExtension } from "../../utils/admin-form"
import { putObjects, tryDeleteObject } from "../../utils/object-storage"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../utils/auth"
import { Artist } from "../../models/artist"

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event, true, { allowBearer: true, skipOriginCheck: true })
	const parts = await readAdminForm(event)
	const name = adminFormText(parts, "name")
	const file = adminFormFile(parts, "file")
	if (name === undefined || !file) {
		setResponseStatus(event, 400)
		return { message: "Required" }
	}
	if (!file.type.includes("image/")) {
		setResponseStatus(event, 400)
		return { message: "Only image files are accepted" }
	}

	const filePath = `artists/${crypto.randomUUID()}.${safeFileExtension(file.name)}`
	await putObjects(event, [{ key: filePath, body: file.data, contentType: file.type }])
	let artist
	try {
		artist = await Artist.create({ name, file: filePath })
	} catch (error) {
		await tryDeleteObject(event, filePath)
		throw error
	}
	setResponseStatus(event, 201)
	return artist
})
