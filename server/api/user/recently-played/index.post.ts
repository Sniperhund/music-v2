import mongoose from "mongoose"
import { readBody } from "h3"
import { Album } from "#server/models/album"
import { User } from "#server/models/user"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "#server/utils/auth"
import { validationResponse } from "#server/utils/api-validation"

const MAX_RECENTLY_PLAYED_ALBUMS = 20

export default defineAuthenticatedEventHandler(async (event) => {
	const authenticatedUser = await requireAuthenticatedUser(event)
	const body = await readBody(event)
	if (!body || typeof body.albumId !== "string" || !mongoose.isValidObjectId(body.albumId)) {
		return validationResponse(event, "Invalid album id")
	}

	const albumExists = await Album.exists({ _id: body.albumId })
	if (!albumExists) return validationResponse(event, "Album does not exist")

	const albumId = new mongoose.Types.ObjectId(body.albumId)
	await User.updateOne(
		{ _id: authenticatedUser._id },
		{ $pull: { recentlyPlayedAlbums: albumId } },
	)
	await User.updateOne(
		{ _id: authenticatedUser._id },
		{
			$push: {
				recentlyPlayedAlbums: {
					$each: [albumId],
					$position: 0,
					$slice: MAX_RECENTLY_PLAYED_ALBUMS,
				},
			},
		},
	)

	return { saved: true }
})
