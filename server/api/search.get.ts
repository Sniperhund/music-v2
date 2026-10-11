import { getQuery } from "h3"
import {
	MAX_QUERY_LIMIT,
	parseNumber,
	parseQueryString,
	validationResponse,
} from "../utils/api-validation"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "../utils/auth"
import { getSearchIndexes } from "../utils/search-index"

const searchTypes = ["track", "album", "artist", "default"] as const

export default defineAuthenticatedEventHandler(async (event) => {
	await requireAuthenticatedUser(event)

	const query = getQuery(event)
	const q = parseQueryString(query.q)
	if ("error" in q) return validationResponse(event, q.error)

	let type = "default"
	if (query.type !== undefined) {
		const parsedType = parseQueryString(query.type)
		if ("error" in parsedType) return validationResponse(event, parsedType.error)
		if (!searchTypes.includes(parsedType.value as (typeof searchTypes)[number])) {
			return validationResponse(
				event,
				`Invalid enum value. Expected 'track' | 'album' | 'artist' | 'default', received '${parsedType.value}'`,
			)
		}
		type = parsedType.value
	}

	const parsedLimit = parseNumber(query.limit, 9, 1, MAX_QUERY_LIMIT)
	if ("error" in parsedLimit) return validationResponse(event, parsedLimit.error)
	const limit = parsedLimit.value
	const indexes = await getSearchIndexes()

	let results: { tracks: any[]; albums: any[]; artists: any[] } = {
		tracks: [],
		albums: [],
		artists: [],
	}

	if (type === "track" || type === "default") {
		results.tracks = indexes.tracks
			.search(q.value)
			.slice(0, limit)
			.map((result) => result.item)
	}

	if (type === "album" || type === "default") {
		results.albums = indexes.albums
			.search(q.value)
			.slice(0, limit)
			.map((result) => result.item)
	}

	if (type === "artist" || type === "default") {
		results.artists = indexes.artists
			.search(q.value)
			.slice(0, limit)
			.map((result) => result.item)
	}

	// Keep the original API's split allocation, including when type selects one category.
	results = {
		tracks: results.tracks.slice(0, Math.ceil(limit / 3)),
		albums: results.albums.slice(0, Math.floor(limit / 3)),
		artists: results.artists.slice(0, Math.floor(limit / 3)),
	}

	return results
})
