import { getQuery, setResponseStatus } from "h3"
import { Album } from "../../models/album"
import { Track } from "../../models/track"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../utils/auth"
import { parseMongoId, validationResponse } from "../../utils/api-validation"
import { tryCleanUploadFileOrDirectory } from "../../utils/upload-files"

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event, true)
	const query = getQuery(event)
	const parsedId = parseMongoId(query.id)
	if ("error" in parsedId) return validationResponse(event, parsedId.error)
	const force = query.force === "true" || query.force === true
	const album = await Album.findById(parsedId.value)
	if (!album) {
		setResponseStatus(event, 404)
		return { message: "Album not found" }
	}

	const dependents = await Track.find({ album: album._id }).select("_id name").exec()
	if (force) await Promise.all(dependents.map((dependent) => Track.findByIdAndDelete(dependent._id)))
	else if (dependents.length) {
		setResponseStatus(event, 409)
		return { message: "Album has one or more dependents", dependentType: "Track", dependents }
	}

	await Album.findByIdAndDelete(parsedId.value)
	void tryCleanUploadFileOrDirectory(event, album.file)
	return {}
})
