import { getRouterParam } from "h3"
import { Album } from "../../models/album"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../utils/auth"
import { parseMongoId, validationResponse } from "../../utils/api-validation"
import { addAlbumTrackVerificationSummary } from "../../utils/album-track-verification"

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event)

	const parsedId = parseMongoId(getRouterParam(event, "id"))
	if ("error" in parsedId) return validationResponse(event, parsedId.error)

	const album = await Album.findOne({ _id: parsedId.value })
		.populate("artists")
		.populate("genre")
		.exec()
	return album ? (await addAlbumTrackVerificationSummary([album]))[0] : null
})
