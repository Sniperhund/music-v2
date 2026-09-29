import { getRouterParam } from "h3"
import { Track } from "../../../models/track"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../../utils/auth"
import { parseMongoId, validationResponse } from "../../../utils/api-validation"

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event)

	const parsedId = parseMongoId(getRouterParam(event, "id"))
	if ("error" in parsedId) return validationResponse(event, parsedId.error)

	const track = await Track.findOne({ _id: parsedId.value }).select("lyrics").exec()
	if (!track) return {}

	return track.lyrics
})
