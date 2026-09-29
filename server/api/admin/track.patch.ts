import path from "node:path"
import mongoose from "mongoose"
import { getQuery } from "h3"
import { readAdminForm, adminFormText, adminFormTexts, adminFormFile, safeFileExtension, parseOptionalJson, splitIds } from "../../utils/admin-form"
import { saveUploadFile, tryCleanUploadFileOrDirectory } from "../../utils/upload-files"
import { getAudioDuration, processAudioFile } from "../../utils/audio-files"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../utils/auth"
import { parseMongoId, validationResponse } from "../../utils/api-validation"
import { Track } from "../../models/track"

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event, true)
	const parsedId = parseMongoId(getQuery(event).id)
	if ("error" in parsedId) return validationResponse(event, parsedId.error)
	const parts = await readAdminForm(event)
	const name = adminFormText(parts, "name")
	const album = adminFormText(parts, "album")
	const artistInput = adminFormTexts(parts, "artists")
	const artists = artistInput.length ? splitIds(artistInput.join(",")) : undefined
	const file = adminFormFile(parts, "file")
	const lyrics = adminFormText(parts, "lyrics")
	if (file && !file.type.includes("audio/")) {
		setResponseStatus(event, 400)
		return { message: "Only audio files are accepted" }
	}
	if (album && !mongoose.isValidObjectId(album)) return validationResponse(event, "Invalid id")
	if (artists && !artists.every((id) => mongoose.isValidObjectId(id))) {
		setResponseStatus(event, 400)
		return { message: "One or more ID(s) are invalid" }
	}

	const track = await Track.findById(parsedId.value)
	if (!track) {
		setResponseStatus(event, 404)
		return {}
	}
	if (file) {
		void tryCleanUploadFileOrDirectory(event, track.fileDir)
		const relativeFilePath = `tracks/${crypto.randomUUID()}/original.${safeFileExtension(file.name)}`
		await saveUploadFile(event, relativeFilePath, file.data)
		const duration = await getAudioDuration(event, relativeFilePath)
		void processAudioFile(event, relativeFilePath).catch((error) => console.error(error))
		track.fileDir = path.dirname(relativeFilePath)
		track.durationInSeconds = Math.round(duration)
	}
	if (name) track.name = name
	if (album) track.album = new mongoose.Types.ObjectId(album)
	if (artists) track.artists = artists.map((id) => new mongoose.Types.ObjectId(id))
	if (lyrics) {
		const parsedLyrics = parseOptionalJson(lyrics)
		if (!parsedLyrics.ok) throw new Error("Invalid lyrics JSON")
		track.lyrics = parsedLyrics.value as any
	}
	await track.save()
	return track
})
