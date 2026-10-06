import { getQuery, getRouterParam } from "h3"
import mongoose, { type PipelineStage } from "mongoose"
import { Album } from "../../../models/album"
import { parseMongoId, parseNumber, validationResponse } from "../../../utils/api-validation"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../../utils/auth"

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event)

	const id = parseMongoId(getRouterParam(event, "id"))
	if ("error" in id) return validationResponse(event, id.error)

	const { limit: rawLimit } = getQuery(event)
	const limit = parseNumber(rawLimit, 10, 1)
	if ("error" in limit) return validationResponse(event, limit.error)

	const pipeline: PipelineStage[] = [
		{ $match: { genre: new mongoose.Types.ObjectId(id.value) } },
		{ $sample: { size: limit.value || 10 } },
		{
			$lookup: {
				from: "artists",
				localField: "artists",
				foreignField: "_id",
				as: "artists",
			},
		},
		{ $unset: "genre" },
	]

	return Album.aggregate(pipeline)
})
