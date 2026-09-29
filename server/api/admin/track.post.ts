import path from "node:path"
import mongoose from "mongoose"
import { readAdminForm, adminFormText, adminFormTexts, adminFormFile, parseOptionalJson, splitIds } from "../../utils/admin-form"
import { saveUploadFile, tryCleanUploadFileOrDirectory } from "../../utils/upload-files"
import { getAudioDuration, processAudioFile } from "../../utils/audio-files"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../utils/auth"
import { Track } from "../../models/track"

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event, true)
	const parts = await readAdminForm(event)
	const name = adminFormText(parts, "name")
	const album = adminFormText(parts, "album")
	const artistInput = adminFormTexts(parts, "artists")
	const artists = artistInput.length ? splitIds(artistInput.join(",")) : undefined
	const file = adminFormFile(parts, "file")
	const lyricsInput = adminFormText(parts, "lyrics")
	if (name === undefined || album === undefined || !artists || !file) {
		setResponseStatus(event, 400)
		return { message: "Required" }
	}
	if (!mongoose.isValidObjectId(album)) {
		setResponseStatus(event, 400)
		return { message: "Invalid id" }
	}
	if (!artists.every((id) => mongoose.isValidObjectId(id))) {
		setResponseStatus(event, 400)
		return { message: "One or more ID(s) are invalid" }
	}
	const parsedLyrics = parseOptionalJson(lyricsInput)
	if (!parsedLyrics.ok) {
		setResponseStatus(event, 400)
		return { message: "Lyrics must be a JSON object" }
	}
	if (!file.type.includes("audio/")) {
		setResponseStatus(event, 400)
		return { message: "Only audio files are accepted" }
	}

	const relativeFilePath = `tracks/${crypto.randomUUID()}/original`
	const fileDirectory = path.dirname(relativeFilePath)
	try {
		console.log("Processing audio")
		await saveUploadFile(event, relativeFilePath, file.data)
		const duration = await getAudioDuration(event, relativeFilePath)
		void processAudioFile(event, relativeFilePath).catch((error) => console.error(error))
		const track = new Track({
			name,
			album: new mongoose.Types.ObjectId(album),
			artists: artists.map((id) => new mongoose.Types.ObjectId(id)),
			fileDir: fileDirectory,
			durationInSeconds: Math.round(duration),
			lyrics: parsedLyrics.value || undefined,
		})
		await track.save()
		setResponseStatus(event, 201)
		return track
	} catch (error) {
		void tryCleanUploadFileOrDirectory(event, fileDirectory)
		console.log(error)
		setResponseStatus(event, 500)
		return undefined
	}
})
