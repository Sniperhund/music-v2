import { Album } from "../models/album"
import { Track } from "../models/track"
import { MAX_QUERY_LIMIT } from "./api-validation"

export async function findVerificationTracks(
	state: "verified" | "awaiting" | "declined" | "minor-changes",
	limit: number,
	skip: number,
) {
	const [approvedAlbums, deniedAlbums] = await Promise.all([
		Album.find({ verification: "approved" }).select("_id").exec(),
		Album.find({ verification: "denied" }).select("_id").exec(),
	])
	const approvedAlbumIds = approvedAlbums.map((album) => album._id)
	const deniedAlbumIds = deniedAlbums.map((album) => album._id)

	let query
	if (state === "minor-changes") {
		query = { "verification.lyrics": "approved-with-changes" }
	} else if (state === "verified") {
		query = {
			album: { $in: approvedAlbumIds },
			"verification.song": "approved",
			"verification.lyrics": { $in: ["approved", "approved-with-changes"] },
		}
	} else if (state === "declined") {
		query = {
			$or: [
				{ album: { $in: deniedAlbumIds } },
				{ "verification.song": "denied" },
				{ "verification.lyrics": "denied" },
			],
		}
	} else {
		query = {
			$and: [
				{
					$nor: [
						{ album: { $in: deniedAlbumIds } },
						{ "verification.song": "denied" },
						{ "verification.lyrics": "denied" },
					],
				},
				{
					$or: [
						{ album: { $nin: approvedAlbumIds } },
						{ "verification.song": { $ne: "approved" } },
				{ "verification.lyrics": { $nin: ["approved", "approved-with-changes"] } },
					],
				},
			],
		}
	}

	const [tracks, total] = await Promise.all([
		Track.find(query)
			.sort({ _id: 1 })
			.skip(skip)
			.limit(Math.min(limit, MAX_QUERY_LIMIT))
			.populate({ path: "album", select: "-artists", populate: { path: "genre" } })
			.populate("artists")
			.exec(),
		Track.countDocuments(query).exec(),
	])
	return { tracks, total, limit, skip }
}
