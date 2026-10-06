import type { AlbumPalette } from "../palette"

export interface BackgroundFrame {
	width: number
	height: number
	time: number
	beat: number
	random: [number, number]
	angleJitter: number
	flowParams: [number, number, number, number]
	palette: AlbumPalette
}

export interface BackgroundRenderer {
	render(frame: BackgroundFrame): void
	dispose(): void
}
