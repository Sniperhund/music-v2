import mongoose from "mongoose"
import { getQuery } from "h3"
import { readAdminForm, adminFormText, adminFormTexts, adminFormFile, safeFileExtension, parseOptionalJson, splitIds } from "../../utils/admin-form"
import { prepareAudioUpload } from "../../utils/audio-files"
import { putObjects, tryDeleteObjectPrefix } from "../../utils/object-storage"
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
	const parsedLyrics = lyrics ? parseOptionalJson(lyrics) : undefined
	if (parsedLyrics && !parsedLyrics.ok) throw new Error("Invalid lyrics JSON")

	const track = await Track.findById(parsedId.value)
	if (!track) {
		setResponseStatus(event, 404)
		return {}
	}
	let replacementDirectory: string | undefined
	let previousDirectory: string | undefined
	if (file) {
		replacementDirectory = `tracks/${crypto.randomUUID()}`
		const extension = safeFileExtension(file.name)
		const processed = await prepareAudioUpload(file.data, extension)
		await putObjects(event, [
			{ key: `${replacementDirectory}/original${extension ? `.${extension}` : ""}`, body: processed.original, contentType: file.type },
			...processed.renditions.map((rendition) => ({
				key: `${replacementDirectory}/${rendition.name}`,
				body: rendition.body,
				contentType: rendition.contentType,
			})),
		])
		previousDirectory = track.fileDir
		track.fileDir = replacementDirectory
		track.durationInSeconds = Math.round(processed.duration)
	}
	if (name) track.name = name
	if (album) track.album = new mongoose.Types.ObjectId(album)
	if (artists) track.artists = artists.map((id) => new mongoose.Types.ObjectId(id))
	if (parsedLyrics?.ok && parsedLyrics.value !== undefined) track.lyrics = parsedLyrics.value as any
	try {
		await track.save()
	} catch (error) {
		if (replacementDirectory) await tryDeleteObjectPrefix(event, `${replacementDirectory}/`)
		throw error
	}
	if (previousDirectory) await tryDeleteObjectPrefix(event, `${previousDirectory}/`)
	return track
})
