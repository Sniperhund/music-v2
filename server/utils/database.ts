import mongoose from "mongoose"

let connectionPromise: Promise<typeof mongoose> | undefined

/**
 * Connect to the application's shared Mongoose instance.
 * Concurrent callers share the same connection attempt, and failed attempts
 * can be retried after the underlying cause has been corrected.
 */
export function connectToDatabase(uri: string): Promise<typeof mongoose> {
	if (!uri) {
		return Promise.reject(new Error("MongoDB runtime configuration is missing"))
	}

	if (mongoose.connection.readyState === 1) {
		return Promise.resolve(mongoose)
	}

	if (connectionPromise) {
		return connectionPromise
	}

	if (mongoose.connection.readyState === 2) {
		connectionPromise = mongoose.connection
			.asPromise()
			.then(() => mongoose)
			.catch((error: unknown) => {
				throw error
			})
			.finally(() => {
				connectionPromise = undefined
			})

		return connectionPromise
	}

	connectionPromise = mongoose
		.connect(uri)
		.then(() => mongoose)
		.catch((error: unknown) => {
			throw new Error("MongoDB connection failed", { cause: error })
		})
		.finally(() => {
			connectionPromise = undefined
		})

	return connectionPromise
}
