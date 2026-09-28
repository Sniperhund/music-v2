import Fuse from "fuse.js"
import { Album } from "../models/album"
import { Artist } from "../models/artist"
import { Track } from "../models/track"
import {
	parseNumber,
	parseQueryString,
	validationResponse,
} from "../utils/api-validation"
import { requireAuthenticatedUser } from "../utils/auth"

const searchTypes = ["track", "album", "artist", "default"] as const

export default defineEventHandler(async (event) => {
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

	const parsedLimit = parseNumber(query.limit, 9, 1)
	if ("error" in parsedLimit) return validationResponse(event, parsedLimit.error)
	const limit = parsedLimit.value

	let results: { tracks: any[]; albums: any[]; artists: any[] } = {
		tracks: [],
		albums: [],
		artists: [],
	}

	if (type === "track" || type === "default") {
		const rawTracks = await Track.find({})
			.populate(["album", "artists"])
			.lean()

		const fuse = new Fuse(rawTracks, {
			keys: ["name", "lyrics.text"],
			threshold: 0.3,
			distance: 100,
			ignoreLocation: true,
		})

		results.tracks = fuse.search(q.value).slice(0, limit).map((result) => result.item)
	}

	if (type === "album" || type === "default") {
		const rawAlbums = await Album.find({})
			.populate(["artists", "genre"])
			.lean()

		const fuse = new Fuse(rawAlbums, {
			keys: ["name"],
			threshold: 0.3,
			distance: 100,
			ignoreLocation: true,
		})

		results.albums = fuse.search(q.value).slice(0, limit).map((result) => result.item)
	}

	if (type === "artist" || type === "default") {
		const rawArtists = await Artist.find({}).lean()

		const fuse = new Fuse(rawArtists, {
			keys: ["name"],
			threshold: 0.3,
			distance: 100,
			ignoreLocation: true,
		})

		results.artists = fuse.search(q.value).slice(0, limit).map((result) => result.item)
	}

	// Keep the original API's split allocation, including when type selects one category.
	results = {
		tracks: results.tracks.slice(0, Math.ceil(limit / 3)),
		albums: results.albums.slice(0, Math.floor(limit / 3)),
		artists: results.artists.slice(0, Math.floor(limit / 3)),
	}

	return results
})
