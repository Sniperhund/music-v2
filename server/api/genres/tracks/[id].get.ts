import mongoose, { type PipelineStage } from "mongoose"
import { Track } from "../../../models/track"
import { parseMongoId, parseNumber, validationResponse } from "../../../utils/api-validation"
import { requireAuthenticatedUser } from "../../../utils/auth"

export default defineEventHandler(async (event) => {
	await requireAuthenticatedUser(event)

	const id = parseMongoId(getRouterParam(event, "id"))
	if ("error" in id) return validationResponse(event, id.error)

	const { limit: rawLimit } = getQuery(event)
	const limit = parseNumber(rawLimit, 10, 1)
	if ("error" in limit) return validationResponse(event, limit.error)

	const pipeline: PipelineStage[] = [
		{
			$lookup: {
				from: "albums",
				localField: "album",
				foreignField: "_id",
				as: "album",
			},
		},
		{ $unwind: "$album" },
		{
			$lookup: {
				from: "artists",
				localField: "artists",
				foreignField: "_id",
				as: "artists",
			},
		},
		{ $match: { "album.genre": new mongoose.Types.ObjectId(id.value) } },
		{ $sample: { size: limit.value || 10 } },
		{ $unset: "album.artists" },
	]

	return Track.aggregate(pipeline)
})
