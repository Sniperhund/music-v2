import { mkdir, realpath, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import type { H3Event, MultiPartData } from "h3"
import { getBackendRuntimeConfig } from "./backend-config"

export class InvalidUploadPathError extends Error {
	constructor() {
		super("filePath is invalid")
		this.name = "InvalidUploadPathError"
	}
}

export class UploadFileNotFoundError extends Error {
	code = "ENOENT"
	constructor() {
		super("File or directory doesn't exist")
		this.name = "UploadFileNotFoundError"
	}
}

function rootDirectory(event: H3Event) {
	const configured = getBackendRuntimeConfig(event).uploadDir
	if (!configured) throw new Error("Environment variable UPLOAD_DIR not found")
	return path.resolve(configured)
}

function isWithin(root: string, target: string) {
	const relative = path.relative(root, target)
	return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
}

function resolveLexically(root: string, relativePath: string) {
	if (!relativePath || path.isAbsolute(relativePath)) throw new InvalidUploadPathError()
	const target = path.resolve(root, relativePath)
	if (!isWithin(root, target)) throw new InvalidUploadPathError()
	return target
}

export async function resolveUploadFile(event: H3Event, relativePath: string) {
	const root = rootDirectory(event)
	const target = resolveLexically(root, relativePath)
	// Resolve the configured root separately: a missing/unreadable upload root is
	// an operational failure, while a missing requested file is a normal 404.
	const realRoot = await realpath(root)
	let realTarget: string
	try {
		realTarget = await realpath(target)
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new UploadFileNotFoundError()
		throw error
	}
	if (!isWithin(realRoot, realTarget)) throw new InvalidUploadPathError()
	return { root: realRoot, path: realTarget }
}

export async function saveUploadFile(event: H3Event, relativePath: string, data: Buffer) {
	const root = rootDirectory(event)
	const target = resolveLexically(root, relativePath)
	await mkdir(path.dirname(target), { recursive: true })
	const realRoot = await realpath(root)
	const realParent = await realpath(path.dirname(target))
	if (!isWithin(realRoot, realParent)) throw new InvalidUploadPathError()
	try {
		const existing = await realpath(target)
		if (!isWithin(realRoot, existing)) throw new InvalidUploadPathError()
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
	}
	await writeFile(target, data)
}

export async function cleanUploadFileOrDirectory(event: H3Event, relativePath: string) {
	const root = rootDirectory(event)
	const target = resolveLexically(root, relativePath)
	let realTarget: string
	try {
		const [realRoot, resolved] = await Promise.all([realpath(root), realpath(target)])
		if (!isWithin(realRoot, resolved)) throw new InvalidUploadPathError()
		realTarget = resolved
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			console.error("File or directory doesn't exist")
			return
		}
		throw error
	}
	try {
		await rm(realTarget, { recursive: true })
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			console.error("File or directory doesn't exist")
			return
		}
		throw error
	}
}

export async function tryCleanUploadFileOrDirectory(event: H3Event, relativePath: string) {
	try {
		await cleanUploadFileOrDirectory(event, relativePath)
	} catch (error) {
		console.error("Unable to clean uploaded file or directory", error)
	}
}

export function getFormField(parts: MultiPartData[] | undefined, name: string) {
	return parts?.find((part) => part.name === name)
}

export function getFormFieldValues(parts: MultiPartData[] | undefined, name: string) {
	return parts?.filter((part) => part.name === name) ?? []
}

export function formFieldText(part: MultiPartData | undefined) {
	return part ? part.data.toString("utf8") : undefined
}

export function formFieldFile(part: MultiPartData | undefined) {
	if (!part?.filename) return undefined
	return { name: part.filename, type: part.type ?? "", data: part.data }
}
