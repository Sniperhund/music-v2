import { getReplayStats } from "#server/utils/replay"
import { PlaybackEvent } from "#server/models/playback-event"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "#server/utils/auth"

export default defineAuthenticatedEventHandler(async (event) => {
	const user = await requireAuthenticatedUser(event)
	const [periods, artistPeriodTotals, allTime] = await Promise.all([
		PlaybackEvent.aggregate([
			{ $match: { userId: user._id } },
			{ $group: { _id: { $dateToString: { format: "%Y-%m", date: "$startedAt", timezone: "UTC" } }, playCount: { $sum: 1 }, listenedSeconds: { $sum: "$listenedSeconds" } } },
			{ $sort: { _id: -1 } },
		]),
		PlaybackEvent.aggregate([
			{ $match: { userId: user._id } },
			{ $group: { _id: { month: { $dateToString: { format: "%Y-%m", date: "$startedAt", timezone: "UTC" } }, trackId: "$trackId" }, playCount: { $sum: 1 }, listenedSeconds: { $sum: "$listenedSeconds" } } },
			{ $lookup: { from: "tracks", localField: "_id.trackId", foreignField: "_id", as: "track" } },
			{ $unwind: "$track" },
			{ $unwind: "$track.artists" },
			{ $group: { _id: { month: "$_id.month", artistId: "$track.artists" }, playCount: { $sum: "$playCount" }, listenedSeconds: { $sum: "$listenedSeconds" } } },
			{ $lookup: { from: "artists", localField: "_id.artistId", foreignField: "_id", as: "artist" } },
			{ $unwind: "$artist" },
			{ $project: { _id: 0, month: "$_id.month", artist: "$artist.name", playCount: 1, listenedSeconds: 1 } },
		]),
		getReplayStats(user._id),
	])

	const monthLabel = (period: string) => {
		const year = Number(period.slice(0, 4))
		const month = Number(period.slice(5, 7))
		const monthName = new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)))
		return `${monthName}, ${year}`
	}
	const monthlyCards = periods.map((period: { _id: string; playCount: number; listenedSeconds: number }) => ({
		period: period._id,
		title: monthLabel(period._id),
		playCount: period.playCount,
		listenedSeconds: period.listenedSeconds,
		topArtists: artistPeriodTotals
			.filter((entry: { month: string }) => entry.month === period._id)
			.sort((a: { listenedSeconds: number }, b: { listenedSeconds: number }) => b.listenedSeconds - a.listenedSeconds)
			.slice(0, 3)
			.map((entry: { artist: string }) => entry.artist),
	}))

	return {
		cards: [
			...(monthlyCards.length ? [monthlyCards[0]] : []),
			...(allTime.totals.playCount ? [{
				period: "all-time",
				title: "All Time",
				playCount: allTime.totals.playCount,
				listenedSeconds: allTime.totals.listenedSeconds,
				topArtists: allTime.artists.slice(0, 3).map((entry: { artist: { name: string } }) => entry.artist.name),
			}] : []),
			...monthlyCards.slice(1),
		],
	}
})
