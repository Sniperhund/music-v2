import { Track } from "../models/track"

export async function addAlbumTrackVerificationSummary<T extends { _id: unknown }>(albums: T[]) {
	const toPlain = (album: T) => typeof (album as any).toObject === "function" ? (album as any).toObject() : album
	if (!albums.length) return []

	const ids = albums.map((album) => album._id)
	const tracks = await Track.find({ album: { $in: ids } })
		.select("album lyrics.text verification.song verification.lyrics")
		.lean()
	const trackCounts = new Map<string, { approved: number; partial: number; unapproved: number; denied: number }>()
	for (const track of tracks) {
		const albumId = String(track.album)
		const hasLyrics = track.verification?.lyrics !== "instrumental" && Boolean(track.lyrics?.text?.trim())
		const fullyVerified = track.verification?.song === "approved" &&
			(!hasLyrics || track.verification?.lyrics === "approved")
		const hasApprovedFeature = track.verification?.song === "approved" ||
			(hasLyrics && (track.verification?.lyrics === "approved" ||
				track.verification?.lyrics === "approved-with-changes"))
		const counts = trackCounts.get(albumId) ?? { approved: 0, partial: 0, unapproved: 0, denied: 0 }
		if (track.verification?.song === "denied" || track.verification?.lyrics === "denied") counts.denied++
		if (fullyVerified) counts.approved++
		else if (hasApprovedFeature) counts.partial++
		else counts.unapproved++
		trackCounts.set(albumId, counts)
	}

	return albums.map((album) => {
		const counts = trackCounts.get(String(album._id)) ?? { approved: 0, partial: 0, unapproved: 0, denied: 0 }
		return {
			...toPlain(album),
			approvedTrackCount: counts.approved,
			partiallyApprovedTrackCount: counts.partial,
			unapprovedTrackCount: counts.unapproved,
			deniedTrackCount: counts.denied,
			unverifiedTrackCount: counts.partial + counts.unapproved,
		}
	})
}
