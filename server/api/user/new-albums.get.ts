import { getQuery, setResponseStatus } from "h3"
import { Album } from "#server/models/album"
import { Track } from "#server/models/track"
import { User } from "#server/models/user"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "#server/utils/auth"
import { MAX_QUERY_LIMIT, parseNumber, validationResponse } from "#server/utils/api-validation"

export default defineAuthenticatedEventHandler(async (event) => {
	const authenticatedUser = await requireAuthenticatedUser(event)
	const limit = parseNumber(getQuery(event).limit, 20, 1, MAX_QUERY_LIMIT)
	if ("error" in limit) return validationResponse(event, limit.error)

	const user = await User.findById(authenticatedUser._id).select("savedTracks")
	if (!user) {
		setResponseStatus(event, 404)
		return { message: "User not found" }
	}
	if (!user.savedTracks.length) return []

	const savedTracks = await Track.find({ _id: { $in: user.savedTracks } })
		.select("_id album artists")
		.lean()
	const artistIds = [...new Set(savedTracks.flatMap((track: any) =>
		(track.artists ?? []).map((artist: any) => artist.toString()),
	))]
	if (!artistIds.length) return []

	const savedAlbumIds = [...new Set(savedTracks.map((track: any) => track.album?.toString()).filter(Boolean))]
	return Album.aggregate([
		{
			$match: {
				artists: { $in: artistIds },
				...(savedAlbumIds.length ? { _id: { $nin: savedAlbumIds } } : {}),
			},
		},
		{
			$lookup: {
				from: "tracks",
				localField: "_id",
				foreignField: "album",
				as: "tracks",
			},
		},
		{ $match: { "tracks.0": { $exists: true } } },
		{ $addFields: { addedAt: { $ifNull: ["$createdAt", { $toDate: "$_id" }] } } },
		{ $sort: { addedAt: -1, _id: -1 } },
		{ $limit: limit.value },
		{
			$lookup: {
				from: "artists",
				localField: "artists",
				foreignField: "_id",
				as: "artists",
			},
		},
		{
			$lookup: {
				from: "genres",
				localField: "genre",
				foreignField: "_id",
				as: "genre",
			},
		},
		{ $unwind: { path: "$genre", preserveNullAndEmptyArrays: true } },
		{ $unset: ["tracks", "addedAt"] },
	])
})
