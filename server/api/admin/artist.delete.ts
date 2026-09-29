import { getQuery, setResponseStatus } from "h3"
import { Album } from "../../models/album"
import { Artist } from "../../models/artist"
import { Track } from "../../models/track"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../utils/auth"
import { parseMongoId, validationResponse } from "../../utils/api-validation"
import { tryCleanUploadFileOrDirectory } from "../../utils/upload-files"

async function findDependents(model: typeof Track | typeof Album, field: string, value: unknown) {
	return model.find({ [field]: value }).select("_id name").exec()
}

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event, true)
	const query = getQuery(event)
	const parsedId = parseMongoId(query.id)
	if ("error" in parsedId) return validationResponse(event, parsedId.error)
	const force = query.force === "true" || query.force === true
	const artist = await Artist.findById(parsedId.value)
	if (!artist) {
		setResponseStatus(event, 404)
		return { message: "Artist not found" }
	}

	let dependents = await findDependents(Track, "artists", artist._id)
	if (force) await Promise.all(dependents.map((dependent) => Track.findByIdAndDelete(dependent._id)))
	else if (dependents.length) {
		setResponseStatus(event, 409)
		return { message: "Artist has one or more dependents", dependentType: "Track", dependents }
	}

	dependents = await findDependents(Album, "artists", artist._id)
	if (force) await Promise.all(dependents.map((dependent) => Album.findByIdAndDelete(dependent._id)))
	else if (dependents.length) {
		setResponseStatus(event, 409)
		return { message: "Artist has one or more dependents", dependentType: "Artist", dependents }
	}

	await Artist.findByIdAndDelete(parsedId.value)
	void tryCleanUploadFileOrDirectory(event, artist.file)
	return {}
})
