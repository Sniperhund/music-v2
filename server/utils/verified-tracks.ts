import { Album } from "../models/album"
import { Track } from "../models/track"

export async function findVerificationTracks(
	state: "verified" | "awaiting" | "declined",
) {
	const [approvedAlbums, deniedAlbums] = await Promise.all([
		Album.find({ verification: "approved" }).select("_id").exec(),
		Album.find({ verification: "denied" }).select("_id").exec(),
	])
	const approvedAlbumIds = approvedAlbums.map((album) => album._id)
	const deniedAlbumIds = deniedAlbums.map((album) => album._id)

	let query
	if (state === "verified") {
		query = {
			album: { $in: approvedAlbumIds },
			"verification.song": "approved",
			"verification.lyrics": "approved",
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
						{ "verification.lyrics": { $ne: "approved" } },
					],
				},
			],
		}
	}

	return Track.find(query)
		.populate({ path: "album", select: "-artists", populate: { path: "genre" } })
		.populate("artists")
		.exec()
}
