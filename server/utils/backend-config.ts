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
		tokenExpire: config.tokenExpire || process.env.TOKEN_EXPIRE || "1h",
		s3Endpoint: config.s3Endpoint || process.env.S3_ENDPOINT || "",
		s3Bucket: config.s3Bucket || process.env.S3_BUCKET || "",
		s3Region: config.s3Region || process.env.S3_REGION || "us-east-1",
		s3AccessKeyId: config.s3AccessKeyId || process.env.S3_ACCESS_KEY_ID || "",
		s3SecretAccessKey: config.s3SecretAccessKey || process.env.S3_SECRET_ACCESS_KEY || "",
	}
}
