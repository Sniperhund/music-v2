import { readBody, setResponseStatus } from "h3"
import { Album } from "../../models/album"
import { Track } from "../../models/track"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../utils/auth"
import { parseMongoId, validationResponse } from "../../utils/api-validation"

const verificationStatuses = ["approved", "denied"] as const
const lyricsStatuses = [...verificationStatuses, "approved-with-changes"] as const

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event, true, { allowBearer: true, skipOriginCheck: true })
	const body = await readBody<{
		trackId?: string
		trackStatus?: string
		albumStatus?: string
		lyricsStatus?: string
		lyricsNote?: string
	}>(event)
	const parsedTrackId = parseMongoId(body?.trackId)
	if ("error" in parsedTrackId) return validationResponse(event, parsedTrackId.error)

	const { trackStatus, albumStatus, lyricsStatus, lyricsNote } = body
	if (trackStatus === undefined && albumStatus === undefined && lyricsStatus === undefined) {
		return validationResponse(event, "At least one verification decision is required")
	}
	if (trackStatus !== undefined && !verificationStatuses.includes(trackStatus as (typeof verificationStatuses)[number])) {
		return validationResponse(event, "Invalid track verification status")
	}
	if (albumStatus !== undefined && !verificationStatuses.includes(albumStatus as (typeof verificationStatuses)[number])) {
		return validationResponse(event, "Invalid album verification status")
	}
	if (lyricsStatus !== undefined && !lyricsStatuses.includes(lyricsStatus as (typeof lyricsStatuses)[number])) {
		return validationResponse(event, "Invalid lyrics verification status")
	}
	if (lyricsNote !== undefined && (typeof lyricsNote !== "string" || lyricsNote.length > 1000)) {
		return validationResponse(event, "Lyrics change note must be 1000 characters or fewer")
	}
	if (lyricsStatus !== "approved-with-changes" && lyricsNote?.trim()) {
		return validationResponse(event, "A lyrics note is only valid when lyrics need minor changes")
	}

	const track = await Track.findById(parsedTrackId.value)
	if (!track) {
		setResponseStatus(event, 404)
		return { message: "Track not found" }
	}
	if (
		lyricsStatus !== undefined &&
		lyricsStatus !== "denied" &&
		(!track.lyrics?.synced || !track.lyrics.text?.trim())
	) {
		setResponseStatus(event, 400)
		return { message: "Only synced lyrics can be approved" }
	}

	const album = albumStatus !== undefined ? await Album.findById(track.album) : null
	if (albumStatus !== undefined && !album) {
		setResponseStatus(event, 404)
		return { message: "Album not found" }
	}
	const saves = []
	if (trackStatus !== undefined) track.set("verification.song", trackStatus)
	if (lyricsStatus !== undefined) {
		track.set("verification.lyrics", lyricsStatus)
		track.set("verification.lyricsNote", lyricsStatus === "approved-with-changes" ? lyricsNote?.trim() || undefined : undefined)
	}
	if (trackStatus !== undefined || lyricsStatus !== undefined) saves.push(track.save())
	if (album && albumStatus !== undefined) {
		album.set("verification", albumStatus)
		saves.push(album.save())
	}
	await Promise.all(saves)
	return { trackId: track._id, albumId: album?._id, saved: true }
})
