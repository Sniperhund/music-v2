import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../../../utils/auth"
import { getVerificationTrackPage } from "../../../utils/verification-track-page"

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event, true, { allowBearer: true, skipOriginCheck: true })
	return getVerificationTrackPage(event, "verified")
})
