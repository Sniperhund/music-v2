import { PlaybackEvent } from "#server/models/playback-event"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "#server/utils/auth"

export default defineAuthenticatedEventHandler(async (event) => {
	const user = await requireAuthenticatedUser(event)
	const [tracks, artists] = await Promise.all([
		PlaybackEvent.aggregate([
			{ $match: { userId: user._id } },
			{
				$group: {
					_id: "$trackId",
					playCount: { $sum: 1 },
					listenedSeconds: { $sum: "$listenedSeconds" },
					lastPlayedAt: { $max: "$startedAt" },
				},
			},
			{ $sort: { listenedSeconds: -1, playCount: -1 } },
			{
				$lookup: {
					from: "tracks",
					localField: "_id",
					foreignField: "_id",
					as: "track",
				},
			},
			{ $unwind: "$track" },
			{
				$project: {
					_id: 0,
					track: { _id: "$track._id", name: "$track.name", album: "$track.album", artists: "$track.artists" },
					playCount: 1,
					listenedSeconds: 1,
					lastPlayedAt: 1,
				},
			},
		]),
		PlaybackEvent.aggregate([
			{ $match: { userId: user._id } },
			{
				$group: {
					_id: "$trackId",
					playCount: { $sum: 1 },
					listenedSeconds: { $sum: "$listenedSeconds" },
				},
			},
			{
				$lookup: {
					from: "tracks",
					localField: "_id",
					foreignField: "_id",
					as: "track",
				},
			},
			{ $unwind: "$track" },
			{ $unwind: "$track.artists" },
			{
				$group: {
					_id: "$track.artists",
					playCount: { $sum: "$playCount" },
					listenedSeconds: { $sum: "$listenedSeconds" },
				},
			},
			{ $sort: { listenedSeconds: -1, playCount: -1 } },
			{
				$lookup: {
					from: "artists",
					localField: "_id",
					foreignField: "_id",
					as: "artist",
				},
			},
			{ $unwind: "$artist" },
			{
				$project: {
					_id: 0,
					artist: { _id: "$artist._id", name: "$artist.name" },
					playCount: 1,
					listenedSeconds: 1,
				},
			},
		]),
	])

	return { tracks, artists }
})
