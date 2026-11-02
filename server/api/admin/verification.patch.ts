import { getQuery, readBody, setResponseStatus } from "h3"
import { Album } from "../../models/album"
import { Track } from "../../models/track"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../utils/auth"
import { parseMongoId, validationResponse } from "../../utils/api-validation"

const statuses = ["undecided", "approved", "approved-with-changes", "denied"] as const

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event, true, { allowBearer: true, skipOriginCheck: true })
	const parsedId = parseMongoId(getQuery(event).id)
	if ("error" in parsedId) return validationResponse(event, parsedId.error)
	const body = await readBody<{ target?: string; status?: string; lyricsNote?: string }>(event)
	if (!["song", "lyrics", "album", "all", "track-and-album"].includes(body?.target ?? "")) {
		setResponseStatus(event, 400)
		return { message: "Invalid verification target" }
	}
	if (!statuses.includes(body?.status as (typeof statuses)[number])) {
		setResponseStatus(event, 400)
		return { message: "Invalid verification status" }
	}
	const status = body.status as (typeof statuses)[number]
	if (status === "approved-with-changes" && body.target !== "lyrics") {
		setResponseStatus(event, 400)
		return { message: "Minor changes status is only valid for lyrics" }
	}
	if (body.lyricsNote !== undefined && (typeof body.lyricsNote !== "string" || body.lyricsNote.length > 1000)) {
		setResponseStatus(event, 400)
		return { message: "Lyrics change note must be 1000 characters or fewer" }
	}
	if (body.target === "album") {
		const album = await Album.findById(parsedId.value)
		if (!album) {
			setResponseStatus(event, 404)
			return { message: "Album not found" }
		}
		album.set("verification", status)
		await Promise.all([
			album.save(),
			Track.updateMany({ album: album._id }, { $set: { "verification.song": status } }).exec(),
		])
		return { target: "album", status }
	}
	const track = await Track.findById(parsedId.value)
	if (!track) {
		setResponseStatus(event, 404)
		return { message: "Track not found" }
	}
	if (body.target === "all" || body.target === "track-and-album") {
		const album = await Album.findById(track.album)
		if (!album) {
			setResponseStatus(event, 404)
			return { message: "Album not found" }
		}
		track.set("verification.song", status)
		if (body.target === "all" && (status !== "approved" || (track.lyrics?.synced && track.lyrics.text?.trim()))) {
			track.set("verification.lyrics", status)
			track.set("verification.lyricsNote", undefined)
		}
		album.set("verification", status)
		await Promise.all([track.save(), album.save()])
		return { target: "all", status }
	}
	if (
		body.target === "lyrics" &&
		(status === "approved" || status === "approved-with-changes") &&
		(!track.lyrics?.synced || !track.lyrics.text?.trim())
	) {
		setResponseStatus(event, 400)
		return { message: "Only synced lyrics can be approved" }
	}
	track.set(`verification.${body.target}`, status)
	if (body.target === "lyrics") {
		track.set("verification.lyricsNote", status === "approved-with-changes" ? body.lyricsNote?.trim() || undefined : undefined)
	}
	await track.save()
	return { target: body.target, status }
})
