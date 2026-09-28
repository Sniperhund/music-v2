declare module "fluent-ffmpeg" {
	interface FfmpegCommand {
		noVideo(): this
		audioBitrate(bitrate: string): this
		toFormat(format: string): this
		audioCodec(codec: string): this
		on(event: string, listener: (...args: any[]) => void): this
		save(filePath: string): this
	}

	interface FfmpegMetadata {
		format: { duration?: number }
	}

	interface FfmpegFactory {
		(filePath: string): FfmpegCommand
		ffprobe(filePath: string, callback: (error: Error | null, metadata: FfmpegMetadata) => void): void
	}

	const Ffmpeg: FfmpegFactory
	export default Ffmpeg
}
