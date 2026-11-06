import { Album } from "../models/album"
import { Track } from "../models/track"
import { MAX_QUERY_LIMIT } from "./api-validation"

const missingLyricsQuery = {
	$and: [
		{
			$or: [
				{ lyrics: null },
				{ "lyrics.text": { $exists: false } },
				{ "lyrics.text": null },
				{ "lyrics.text": "" },
				{ "lyrics.text": /^\s*$/ },
			],
		},
		{ "verification.lyrics": { $ne: "instrumental" } },
	],
}

export async function findVerificationTracks(
	state: "verified" | "awaiting" | "declined" | "minor-changes" | "missing-lyrics",
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
	} else if (state === "missing-lyrics") {
		query = missingLyricsQuery
	} else if (state === "verified") {
		query = {
			album: { $in: approvedAlbumIds },
			"verification.song": "approved",
			$or: [
				{ "verification.lyrics": "instrumental" },
				{ "verification.lyrics": "approved", "lyrics.text": { $regex: /\S/ } },
			],
		}
	} else if (state === "declined") {
		query = {
			$or: [
				{ album: { $in: deniedAlbumIds } },
				{ "verification.song": "denied" },
				{ $and: [{ "lyrics.text": { $exists: true, $nin: [null, ""] } }, { "verification.lyrics": "denied" }] },
			],
		}
	} else {
		query = {
			$and: [
				{
					$nor: [
						{ album: { $in: deniedAlbumIds } },
						{ "verification.song": "denied" },
						{ $and: [{ "lyrics.text": { $exists: true, $nin: [null, ""] } }, { "verification.lyrics": "denied" }] },
						missingLyricsQuery,
					],
				},
				{
					$or: [
						{ album: { $nin: approvedAlbumIds } },
						{ "verification.song": { $ne: "approved" } },
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
