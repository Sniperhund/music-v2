import mongoose from "mongoose"
import { readAdminForm, adminFormText, adminFormTexts, adminFormFile, parseOptionalJson, splitIds } from "../../utils/admin-form"
import { prepareAudioUpload } from "../../utils/audio-files"
import { putObjects, tryDeleteObjectPrefix } from "../../utils/object-storage"
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

	const fileDirectory = `tracks/${crypto.randomUUID()}`
	try {
		const extension = safeFileExtension(file.name)
		const processed = await prepareAudioUpload(file.data, extension)
		await putObjects(event, [
			{ key: `${fileDirectory}/original${extension ? `.${extension}` : ""}`, body: processed.original, contentType: file.type },
			...processed.renditions.map((rendition) => ({
				key: `${fileDirectory}/${rendition.name}`,
				body: rendition.body,
				contentType: rendition.contentType,
			})),
		])
		const track = new Track({
			name,
			album: new mongoose.Types.ObjectId(album),
			artists: artists.map((id) => new mongoose.Types.ObjectId(id)),
			fileDir: fileDirectory,
			durationInSeconds: Math.round(processed.duration),
			lyrics: parsedLyrics.value || undefined,
		})
		try {
			await track.save()
		} catch (error) {
			await tryDeleteObjectPrefix(event, `${fileDirectory}/`)
			throw error
		}
		setResponseStatus(event, 201)
		return track
	} catch (error) {
		console.error(error)
		setResponseStatus(event, 500)
		return undefined
	}
})
