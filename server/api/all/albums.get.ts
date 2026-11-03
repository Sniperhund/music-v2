import { Album } from "../../models/album"
import { addAlbumTrackVerificationSummary } from "../../utils/album-track-verification"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../utils/auth"

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event)

	const albums = await Album.find({}).populate("artists").populate("genre")
	return addAlbumTrackVerificationSummary(albums)
})
