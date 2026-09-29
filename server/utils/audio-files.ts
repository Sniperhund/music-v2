import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import Ffmpeg from "fluent-ffmpeg"

const jobs: Array<[string, string, string, string, string]> = [
	["128k", "mp3", "libmp3lame", "low.mp3", "audio/mpeg"],
	["256k", "mp3", "libmp3lame", "mid.mp3", "audio/mpeg"],
	["96k", "mp4", "aac", "low.m4a", "audio/mp4"],
	["192k", "mp4", "aac", "mid.m4a", "audio/mp4"],
	["320k", "mp4", "aac", "high.m4a", "audio/mp4"],
]

function getDuration(sourcePath: string): Promise<number> {
	return new Promise((resolve, reject) => {
		Ffmpeg.ffprobe(sourcePath, (error, metadata) => {
			if (error) return reject(error)
			if (metadata.format.duration) return resolve(metadata.format.duration)
			reject(new Error("Unable to read audio duration"))
		})
	})
}

function transcode(sourcePath: string, outputPath: string, bitrate: string, format: string, codec: string) {
	return new Promise<void>((resolve, reject) => {
		Ffmpeg(sourcePath)
			.noVideo()
			.audioBitrate(bitrate)
			.toFormat(format)
			.audioCodec(codec)
			.on("end", () => resolve())
			.on("error", reject)
			.save(outputPath)
	})
}

export async function prepareAudioUpload(data: Buffer, extension: string) {
	const directory = await mkdtemp(path.join(os.tmpdir(), "music-v2-audio-"))
	const sourcePath = path.join(directory, `original${extension ? `.${extension}` : ""}`)
	try {
		await writeFile(sourcePath, data)
		const duration = await getDuration(sourcePath)
		const completed = await Promise.allSettled(jobs.map(([bitrate, format, codec, name]) =>
			transcode(sourcePath, path.join(directory, name), bitrate, format, codec),
		))
		const failedJob = completed.find((result) => result.status === "rejected")
		if (failedJob?.status === "rejected") throw failedJob.reason
		const renditions = await Promise.all(jobs.map(async ([, , , name, contentType]) => ({
			name,
			contentType,
			body: await readFile(path.join(directory, name)),
		})))
		return { duration, original: data, renditions }
	} finally {
		await rm(directory, { recursive: true, force: true })
	}
}
