import { getQuery, setResponseStatus } from "h3"
import { Track } from "../../models/track"
import { requireAuthenticatedUser } from "../../utils/auth"
import { parseMongoId, validationResponse } from "../../utils/api-validation"
import { tryCleanUploadFileOrDirectory } from "../../utils/upload-files"

export default defineEventHandler(async (event) => {
	await requireAuthenticatedUser(event, true)
	const parsedId = parseMongoId(getQuery(event).id)
	if ("error" in parsedId) return validationResponse(event, parsedId.error)

	const track = await Track.findByIdAndDelete(parsedId.value)
	if (!track) {
		setResponseStatus(event, 404)
		return {}
	}
	void tryCleanUploadFileOrDirectory(event, track.fileDir)
	return {}
})
