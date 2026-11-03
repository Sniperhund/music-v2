import { getQuery } from "h3"
import type { H3Event } from "h3"
import { MAX_QUERY_LIMIT, parseNumber, validationResponse } from "./api-validation"
import { findVerificationTracks } from "./verified-tracks"

export async function getVerificationTrackPage(
	event: H3Event,
	state: "verified" | "awaiting" | "declined" | "minor-changes" | "missing-lyrics",
) {
	const query = getQuery(event)
	const limit = parseNumber(query.limit, 25, 1, MAX_QUERY_LIMIT)
	if ("error" in limit) return validationResponse(event, limit.error)
	const skip = parseNumber(query.skip, 0, 0)
	if ("error" in skip) return validationResponse(event, skip.error)
	return findVerificationTracks(state, limit.value, skip.value)
}
