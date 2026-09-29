import type { H3Event } from "h3"

/**
 * Read private backend settings at runtime. Nuxt's NUXT_* runtime overrides
 * take precedence, while existing standalone-backend variable names remain
 * usable during the migration.
 */
export function getBackendRuntimeConfig(event?: H3Event) {
	const config = useRuntimeConfig(event)

	return {
		mongodbUri: config.mongodbUri || process.env.MONGODB_URI || "",
		uploadDir: config.uploadDir || process.env.UPLOAD_DIR || "",
		mediaBaseUrl: config.mediaBaseUrl || process.env.MEDIA_BASE_URL || "",
		tokenExpire: config.tokenExpire || process.env.TOKEN_EXPIRE || "1h",
	}
}
