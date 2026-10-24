import { PlaybackEvent } from "#server/models/playback-event"

export interface ReplayWindow {
	from?: Date
	to?: Date
}

const matchFor = (userId: unknown, window: ReplayWindow) => ({
	userId,
	...(window.from || window.to
		? { startedAt: { ...(window.from ? { $gte: window.from } : {}), ...(window.to ? { $lt: window.to } : {}) } }
		: {}),
})

export async function getReplayStats(userId: unknown, window: ReplayWindow = {}) {
	const match = matchFor(userId, window)
	const [totals, tracks, artists, albums] = await Promise.all([
		PlaybackEvent.aggregate([
			{ $match: match },
			{
				$group: {
					_id: null,
					playCount: { $sum: 1 },
					listenedSeconds: { $sum: "$listenedSeconds" },
					activeDays: { $addToSet: { $dateToString: { format: "%Y-%m-%d", date: "$startedAt", timezone: "UTC" } } },
				},
			},
			{ $project: { _id: 0, playCount: 1, listenedSeconds: 1, activeDays: { $size: "$activeDays" } } },
		]),
		PlaybackEvent.aggregate([
			{ $match: match },
			{ $group: { _id: "$trackId", playCount: { $sum: 1 }, listenedSeconds: { $sum: "$listenedSeconds" }, lastPlayedAt: { $max: "$startedAt" } } },
			{ $sort: { listenedSeconds: -1, playCount: -1 } },
			{ $limit: 10 },
			{ $lookup: { from: "tracks", localField: "_id", foreignField: "_id", as: "track" } },
			{ $unwind: "$track" },
			{ $lookup: { from: "artists", localField: "track.artists", foreignField: "_id", as: "artists" } },
			{ $lookup: { from: "albums", localField: "track.album", foreignField: "_id", as: "album" } },
			{ $unwind: { path: "$album", preserveNullAndEmptyArrays: true } },
			{ $project: { _id: 0, track: { _id: "$track._id", name: "$track.name", fileDir: "$track.fileDir", durationInSeconds: "$track.durationInSeconds", lyrics: "$track.lyrics", artists: { $map: { input: "$artists", as: "artist", in: { _id: "$$artist._id", name: "$$artist.name" } } }, album: { _id: "$album._id", name: "$album.name", file: "$album.file" } }, playCount: 1, listenedSeconds: 1, lastPlayedAt: 1 } },
		]),
		PlaybackEvent.aggregate([
			{ $match: match },
			{ $group: { _id: "$trackId", playCount: { $sum: 1 }, listenedSeconds: { $sum: "$listenedSeconds" } } },
			{ $lookup: { from: "tracks", localField: "_id", foreignField: "_id", as: "track" } },
			{ $unwind: "$track" },
			{ $unwind: "$track.artists" },
			{ $group: { _id: "$track.artists", playCount: { $sum: "$playCount" }, listenedSeconds: { $sum: "$listenedSeconds" } } },
			{ $sort: { listenedSeconds: -1, playCount: -1 } },
			{ $limit: 10 },
			{ $lookup: { from: "artists", localField: "_id", foreignField: "_id", as: "artist" } },
			{ $unwind: "$artist" },
			{ $project: { _id: 0, artist: { _id: "$artist._id", name: "$artist.name" }, playCount: 1, listenedSeconds: 1 } },
		]),
		PlaybackEvent.aggregate([
			{ $match: match },
			{ $group: { _id: "$trackId", playCount: { $sum: 1 }, listenedSeconds: { $sum: "$listenedSeconds" } } },
			{ $lookup: { from: "tracks", localField: "_id", foreignField: "_id", as: "track" } },
			{ $unwind: "$track" },
			{ $group: { _id: "$track.album", playCount: { $sum: "$playCount" }, listenedSeconds: { $sum: "$listenedSeconds" } } },
			{ $sort: { listenedSeconds: -1, playCount: -1 } },
			{ $limit: 10 },
			{ $lookup: { from: "albums", localField: "_id", foreignField: "_id", as: "album" } },
			{ $unwind: "$album" },
			{ $project: { _id: 0, album: { _id: "$album._id", name: "$album.name", file: "$album.file" }, playCount: 1, listenedSeconds: 1 } },
		]),
	])

	return {
		totals: totals[0] ?? { playCount: 0, listenedSeconds: 0, activeDays: 0 },
		tracks,
		artists,
		albums,
	}
}
