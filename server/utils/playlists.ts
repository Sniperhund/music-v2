export const PLAYLIST_NAME_MAX_LENGTH = 100

export function parsePlaylistName(value: unknown): string | null {
	if (typeof value !== "string") return null
	const name = value.trim()
	return name.length > 0 && name.length <= PLAYLIST_NAME_MAX_LENGTH ? name : null
}

export async function populatePlaylistTracks(playlist: any) {
	await playlist.populate({
		path: "tracks",
		populate: [
			{ path: "artists" },
			{ path: "album", populate: { path: "artists" } },
		],
	})
	playlist.tracks = playlist.tracks.filter((track: unknown) => track != null)
	return playlist
}
