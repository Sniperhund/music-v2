import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { Readable } from "node:stream"
import path from "node:path"
import {
	assertMethod,
	createError,
	getRouterParam,
	getRequestHeader,
	sendStream,
	setHeader,
	setResponseStatus,
} from "h3"
import { getBackendRuntimeConfig } from "../../utils/backend-config"
import {
	InvalidUploadPathError,
	resolveUploadFile,
	UploadFileNotFoundError,
} from "../../utils/upload-files"

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

function sendRangeNotSatisfiable(
	event: Parameters<typeof setResponseStatus>[0],
	size: number,
) {
	setResponseStatus(event, 416)
	setHeader(event, "Content-Range", `bytes */${size}`)
	setHeader(event, "Accept-Ranges", "bytes")
	setHeader(event, "Content-Length", 0)
	return null
}

function parseRange(rangeHeader: string | undefined, size: number) {
	let start = 0
	let end = size - 1
	if (!rangeHeader) return { start, end, partial: false }
	const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
	if (!match || (!match[1] && !match[2]) || size === 0) return null
	if (!match[1]) {
		const suffixLength = Number(match[2])
		if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0)
			return null
		start = Math.max(size - suffixLength, 0)
	} else {
		start = Number(match[1])
		if (!Number.isSafeInteger(start)) return null
		if (match[2]) {
			end = Number(match[2])
			if (!Number.isSafeInteger(end)) return null
		}
	}
	if (start >= size || end < start) return null
	return { start, end: Math.min(end, size - 1), partial: true }
}

function remoteObjectUrl(baseUrl: string, relativePath: string) {
	if (
		!relativePath ||
		relativePath.includes("\\") ||
		relativePath
			.split("/")
			.some((part) => !part || part === "." || part === "..")
	) {
		throw new InvalidUploadPathError()
	}
	const base = baseUrl.replace(/\/+$/, "")
	return `${base}/${relativePath.split("/").map(encodeURIComponent).join("/")}`
}

async function serveRemote(
	event: Parameters<typeof setResponseStatus>[0],
	url: string,
	extension: string,
) {
	const method = event.node.req.method === "HEAD" ? "HEAD" : "GET"
	const head = await fetch(url, { method: "HEAD" })
	if (head.status === 404) return { found: false as const, body: null }
	if (!head.ok)
		throw createError({
			statusCode: 502,
			statusMessage: `Media bucket returned ${head.status}`,
		})
	const size = Number(head.headers.get("content-length"))
	if (!Number.isSafeInteger(size) || size < 0)
		throw createError({
			statusCode: 502,
			statusMessage: "Media bucket returned invalid content length",
		})
	setHeader(
		event,
		"Accept-Ranges",
		head.headers.get("accept-ranges") || "bytes",
	)
	setHeader(
		event,
		"Content-Type",
		head.headers.get("content-type") ||
			contentTypes[extension] ||
			"application/octet-stream",
	)
	const range = parseRange(getRequestHeader(event, "range"), size)
	if (!range)
		return {
			found: true as const,
			body: sendRangeNotSatisfiable(event, size),
		}
	const length = size === 0 ? 0 : range.end - range.start + 1
	if (range.partial) {
		setResponseStatus(event, 206)
		setHeader(
			event,
			"Content-Range",
			`bytes ${range.start}-${range.end}/${size}`,
		)
	}
	setHeader(event, "Content-Length", length)
	if (method === "HEAD" || length === 0)
		return { found: true as const, body: null }
	const response = await fetch(url, {
		headers: { Range: `bytes=${range.start}-${range.end}` },
	})
	if (response.status !== 206 || !response.body)
		throw createError({
			statusCode: 502,
			statusMessage:
				"Media bucket failed to return the requested byte range",
		})
	return {
		found: true as const,
		body: sendStream(
			event,
			Readable.fromWeb(
				response.body as import("node:stream/web").ReadableStream,
			),
		),
	}
}

export default defineEventHandler(async (event) => {
	assertMethod(event, ["GET", "HEAD"])
	const relativePath = getRouterParam(event, "path")
	if (!relativePath) {
		setResponseStatus(event, 404)
		return null
	}
	const config = getBackendRuntimeConfig(event)
	if (config.mediaBaseUrl) {
		const url = remoteObjectUrl(config.mediaBaseUrl, relativePath)
		const remote = await serveRemote(
			event,
			url,
			path.extname(relativePath).toLowerCase(),
		)
		if (remote.found) return remote.body
		// Missing bucket objects fall through to local media during the read migration.
	}

	let file: { path: string }
	try {
		file = await resolveUploadFile(event, relativePath)
	} catch (error) {
		if (
			error instanceof InvalidUploadPathError ||
			error instanceof UploadFileNotFoundError
		) {
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
	setHeader(
		event,
		"Content-Type",
		contentTypes[path.extname(file.path).toLowerCase()] ??
			"application/octet-stream",
	)
	const range = parseRange(getRequestHeader(event, "range"), metadata.size)
	if (!range) return sendRangeNotSatisfiable(event, metadata.size)
	const length = metadata.size === 0 ? 0 : range.end - range.start + 1
	if (range.partial) {
		setResponseStatus(event, 206)
		setHeader(
			event,
			"Content-Range",
			`bytes ${range.start}-${range.end}/${metadata.size}`,
		)
	}
	setHeader(event, "Content-Length", length)
	if (event.node.req.method === "HEAD" || length === 0) return null

	console.log(file.path)

	return sendStream(
		event,
		createReadStream(file.path, { start: range.start, end: range.end }),
	)
})
