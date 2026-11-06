interface Base {
	_id: string
}

export type VerificationStatus = "undecided" | "approved" | "denied"
export type LyricsVerificationStatus = VerificationStatus | "approved-with-changes" | "instrumental"

export interface Album extends Base {
	name: string
	file: string
	artists: Artist[]
	genre: Genre
	verification?: VerificationStatus
	unverifiedTrackCount?: number
	approvedTrackCount?: number
	partiallyApprovedTrackCount?: number
	unapprovedTrackCount?: number
	deniedTrackCount?: number
}

export interface Artist extends Base {
	name: string
	file: string
}

export interface Genre extends Base {
	name: string
}

export interface Track extends Base {
	name: string
	fileDir: string
	lyrics: {
		synced: boolean
		text: string
	} | null
	verification?: {
		song: VerificationStatus
		lyrics: LyricsVerificationStatus
		lyricsNote?: string
	}
	album: Album
	artists: Artist[]
	durationInSeconds: number
}

export interface TrackPage {
	tracks: Track[]
	total: number
	limit: number
	skip: number
}

export interface Playlist extends Base {
	name: string
	tracks: Track[]
	createdAt: string
	updatedAt: string
}
