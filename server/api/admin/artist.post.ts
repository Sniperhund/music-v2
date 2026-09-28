import { readAdminForm, adminFormText, adminFormFile, safeFileExtension } from "../../utils/admin-form"
import { saveUploadFile } from "../../utils/upload-files"
import { requireAuthenticatedUser } from "../../utils/auth"
import { Artist } from "../../models/artist"

export default defineEventHandler(async (event) => {
	await requireAuthenticatedUser(event, true)
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
	await saveUploadFile(event, filePath, file.data)
	const artist = await Artist.create({ name, file: filePath })
	setResponseStatus(event, 201)
	return artist
})
