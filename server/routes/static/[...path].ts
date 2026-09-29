import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import path from "node:path"
import { assertMethod, getRouterParam, getRequestHeader, sendStream, setHeader, setResponseStatus } from "h3"
import { InvalidUploadPathError, resolveUploadFile, UploadFileNotFoundError } from "../../utils/upload-files"

const contentTypes: Record<string, string> = {
	".aac": "audio/aac",
	".flac": "audio/flac",
	".jpeg": "image/jpeg",
	".jpg": "image/jpeg",
	".m4a": "audio/mp4",
	".mp3": "audio/mpeg",
	".mp4": "video/mp4",
	".ogg": "audio/ogg",
	".png": "image/png",
	".wav": "audio/wav",
	".webp": "image/webp",
}

function sendRangeNotSatisfiable(event: Parameters<typeof setResponseStatus>[0], size: number) {
	setResponseStatus(event, 416)
	setHeader(event, "Content-Range", `bytes */${size}`)
	setHeader(event, "Accept-Ranges", "bytes")
	setHeader(event, "Content-Length", 0)
	return null
}

export default defineEventHandler(async (event) => {
	assertMethod(event, ["GET", "HEAD"])
	const relativePath = getRouterParam(event, "path")
	if (!relativePath) {
		setResponseStatus(event, 404)
		return null
	}

	let file: { path: string }
	try {
		file = await resolveUploadFile(event, relativePath)
	} catch (error) {
		if (error instanceof InvalidUploadPathError || error instanceof UploadFileNotFoundError) {
			setResponseStatus(event, 404)
			return null
		}
		throw error
	}

	let metadata
	try {
		metadata = await stat(file.path)
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			setResponseStatus(event, 404)
			return null
		}
		throw error
	}
	if (!metadata.isFile()) {
		setResponseStatus(event, 404)
		return null
	}

	setHeader(event, "Accept-Ranges", "bytes")
	setHeader(event, "Content-Type", contentTypes[path.extname(file.path).toLowerCase()] ?? "application/octet-stream")
	const rangeHeader = getRequestHeader(event, "range")
	let start = 0
	let end = metadata.size - 1

	if (rangeHeader) {
		const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
		if (!match || (!match[1] && !match[2]) || metadata.size === 0) {
			return sendRangeNotSatisfiable(event, metadata.size)
		}

		if (!match[1]) {
			const suffixLength = Number(match[2])
			if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return sendRangeNotSatisfiable(event, metadata.size)
			start = Math.max(metadata.size - suffixLength, 0)
		} else {
			start = Number(match[1])
			if (!Number.isSafeInteger(start)) return sendRangeNotSatisfiable(event, metadata.size)
			if (match[2]) {
				end = Number(match[2])
				if (!Number.isSafeInteger(end)) return sendRangeNotSatisfiable(event, metadata.size)
			}
		}
		if (start >= metadata.size || end < start) return sendRangeNotSatisfiable(event, metadata.size)
		end = Math.min(end, metadata.size - 1)
		setResponseStatus(event, 206)
		setHeader(event, "Content-Range", `bytes ${start}-${end}/${metadata.size}`)
		setHeader(event, "Content-Length", end - start + 1)
	} else {
		setHeader(event, "Content-Length", metadata.size)
	}

	if (event.node.req.method === "HEAD") return null
	if (metadata.size === 0) return null
	return sendStream(event, createReadStream(file.path, { start, end }))
})
