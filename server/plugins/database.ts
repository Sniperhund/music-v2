import { connectToDatabase } from "../utils/database"
import { getBackendRuntimeConfig } from "../utils/backend-config"

export default defineNitroPlugin(async () => {
	const { mongodbUri } = getBackendRuntimeConfig()

	if (!mongodbUri) {
		throw new Error("Missing required MongoDB configuration. Set NUXT_MONGODB_URI or MONGODB_URI.")
	}

	await connectToDatabase(mongodbUri)
	console.info("Database connected")
})
