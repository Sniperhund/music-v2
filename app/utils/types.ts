interface Base {
	_id: string
}

export interface Album extends Base {
	name: string
	file: string
	artists: Artist[]
	genre: Genre
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
	album: Album
	artists: Artist[]
	durationInSeconds: number
}
