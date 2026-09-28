import { unlink } from "node:fs/promises"
import path from "node:path"
import Ffmpeg from "fluent-ffmpeg"
import type { H3Event } from "h3"
import { resolveUploadFile } from "./upload-files"

export async function getAudioDuration(event: H3Event, relativePath: string): Promise<number> {
	if (!relativePath) throw new Error("filePath is undefined")
	const { path: sourcePath } = await resolveUploadFile(event, relativePath)
	return new Promise((resolve, reject) => {
		Ffmpeg.ffprobe(sourcePath, (error, metadata) => {
			if (error) return reject(0)
			if (metadata.format.duration) return resolve(metadata.format.duration)
			reject(0)
		})
	})
}

export async function processAudioFile(event: H3Event, relativePath: string) {
	if (!relativePath) throw new Error("filePath is undefined")
	const { path: sourcePath } = await resolveUploadFile(event, relativePath)
	const directory = path.dirname(sourcePath)
	const jobs: Array<[string, string, string]> = [
		["128k", "mp3", "libmp3lame"],
		["256k", "mp3", "libmp3lame"],
		["96k", "mp4", "aac"],
		["192k", "mp4", "aac"],
		["320k", "mp4", "aac"],
	]
	const names = ["low.mp3", "mid.mp3", "low.m4a", "mid.m4a", "high.m4a"]

	await Promise.all(
		jobs.map(([bitrate, format, codec], index) =>
			new Promise<void>((resolve, reject) => {
				Ffmpeg(sourcePath)
					.noVideo()
					.audioBitrate(bitrate)
					.toFormat(format)
					.audioCodec(codec)
					.on("end", () => resolve())
					.on("error", reject)
					.save(path.join(directory, names[index]!))
			}),
		),
	)
	await unlink(sourcePath)
}
