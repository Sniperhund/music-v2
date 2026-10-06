import { cp, mkdir } from "node:fs/promises"
import { resolve } from "node:path"

const publicOutput = resolve(".output/public")
const nitroAssetDirectory = resolve(".output/server/chunks/public")
const nuxtAssetsDirectory = resolve(publicOutput, "_nuxt")

await mkdir(nitroAssetDirectory, { recursive: true })
await cp(publicOutput, nitroAssetDirectory, {
	recursive: true,
	force: true,
	filter: (path) => path !== nuxtAssetsDirectory,
})
