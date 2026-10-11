import Fuse from "fuse.js"
import { Album } from "../models/album"
import { Artist } from "../models/artist"
import { Track } from "../models/track"

const cacheDurationMs = 60_000

type SearchIndexes = {
	tracks: Fuse<any>
	albums: Fuse<any>
	artists: Fuse<any>
}

let cachedIndexes: SearchIndexes | null = null
let cachedAt = 0
let indexLoad: Promise<SearchIndexes> | null = null

export async function getSearchIndexes() {
	if (cachedIndexes && Date.now() - cachedAt < cacheDurationMs) {
		return cachedIndexes
	}
	if (indexLoad) return indexLoad

	indexLoad = (async () => {
		const [rawTracks, rawAlbums, rawArtists] = await Promise.all([
			Track.find({}).populate(["album", "artists"]).lean(),
			Album.find({}).populate(["artists", "genre"]).lean(),
			Artist.find({}).lean(),
		])
		const options = {
			threshold: 0.3,
			distance: 100,
			ignoreLocation: true,
		}

		const indexes: SearchIndexes = {
			tracks: new Fuse(rawTracks, { ...options, keys: ["name", "lyrics.text"] }),
			albums: new Fuse(rawAlbums, { ...options, keys: ["name"] }),
			artists: new Fuse(rawArtists, { ...options, keys: ["name"] }),
		}
		cachedIndexes = indexes
		cachedAt = Date.now()
		return indexes
	})()

	try {
		return await indexLoad
	} finally {
		indexLoad = null
	}
}
