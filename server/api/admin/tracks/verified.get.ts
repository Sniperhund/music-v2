import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../../utils/auth"
import { findVerificationTracks } from "../../../utils/verified-tracks"

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event, true, { allowBearer: true, skipOriginCheck: true })
	return findVerificationTracks("verified")
})
