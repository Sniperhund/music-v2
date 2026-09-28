type HttpMethod = "get" | "post" | "patch" | "delete"

type ApiOperation = {
	method: HttpMethod
	path: string
	tag: string
	summary: string
	auth?: boolean
	admin?: boolean
	query?: string[]
	body?: "json" | "multipart"
	response?: string
	status?: number
}

const operations: ApiOperation[] = [
	{ method: "post", path: "/auth/register", tag: "Auth", summary: "Register a user", body: "json", response: "EmptyObject", status: 201 },
	{ method: "post", path: "/auth/signin", tag: "Auth", summary: "Sign in", body: "json", response: "EmptyObject" },
	{ method: "post", path: "/auth/session", tag: "Auth", summary: "Create a session", body: "json", response: "Session", status: 201 },
	{ method: "get", path: "/auth/session", tag: "Auth", summary: "Get or renew the current session", response: "SessionStatus" },
	{ method: "post", path: "/auth/signout", tag: "Auth", summary: "Sign out", response: "Signout" },
	{ method: "get", path: "/artists", tag: "Artist", summary: "Get artists by ID", auth: true, query: ["ids"], response: "ArtistList" },
	{ method: "get", path: "/artists/{id}", tag: "Artist", summary: "Get an artist", auth: true, response: "ArtistOrNull" },
	{ method: "get", path: "/artists/{id}/tracks", tag: "Artist", summary: "Get tracks for an artist", auth: true, query: ["limit", "skip"], response: "TrackList" },
	{ method: "get", path: "/artists/{id}/albums", tag: "Artist", summary: "Get albums for an artist", auth: true, query: ["limit", "skip"], response: "AlbumList" },
	{ method: "get", path: "/albums", tag: "Album", summary: "Get albums by ID", auth: true, query: ["ids"], response: "AlbumList" },
	{ method: "get", path: "/albums/{id}", tag: "Album", summary: "Get an album", auth: true, response: "AlbumOrNull" },
	{ method: "get", path: "/albums/{id}/tracks", tag: "Album", summary: "Get tracks for an album", auth: true, query: ["limit", "skip"], response: "TrackList" },
	{ method: "get", path: "/genres/random", tag: "Genre", summary: "Get random genres", auth: true, query: ["limit"], response: "GenreList" },
	{ method: "get", path: "/genres/albums/{id}", tag: "Genre", summary: "Get albums for a genre", auth: true, query: ["limit", "skip"], response: "AlbumList" },
	{ method: "get", path: "/genres/tracks/{id}", tag: "Genre", summary: "Get tracks for a genre", auth: true, query: ["limit", "skip"], response: "TrackList" },
	{ method: "get", path: "/tracks", tag: "Track", summary: "Get tracks by ID", auth: true, query: ["ids"], response: "TrackList" },
	{ method: "get", path: "/tracks/{id}", tag: "Track", summary: "Get a track", auth: true, response: "TrackOrNull" },
	{ method: "get", path: "/tracks/{id}/lyrics", tag: "Track", summary: "Get track lyrics", auth: true, response: "Lyrics" },
	{ method: "get", path: "/all/albums", tag: "All", summary: "Get all albums", auth: true, response: "AlbumList" },
	{ method: "get", path: "/all/artists", tag: "All", summary: "Get all artists", auth: true, response: "ArtistList" },
	{ method: "get", path: "/all/genres", tag: "All", summary: "Get all genres", auth: true, response: "GenreList" },
	{ method: "get", path: "/all/tracks", tag: "All", summary: "Get all tracks", auth: true, response: "TrackList" },
	{ method: "get", path: "/search", tag: "Search", summary: "Search tracks, albums and artists", auth: true, query: ["q", "type", "limit"], response: "SearchResults" },
	{ method: "get", path: "/user", tag: "User", summary: "Get the current user", auth: true, response: "User" },
	{ method: "get", path: "/user/tracks", tag: "User", summary: "Get saved tracks", auth: true, response: "TrackList" },
	{ method: "patch", path: "/user/tracks", tag: "User", summary: "Save a track", auth: true, query: ["id"], response: "EmptyObject" },
	{ method: "post", path: "/admin/artist", tag: "Admin", summary: "Create an artist", admin: true, body: "multipart", response: "Artist", status: 201 },
	{ method: "patch", path: "/admin/artist", tag: "Admin", summary: "Update an artist", admin: true, query: ["id"], body: "multipart", response: "Artist" },
	{ method: "delete", path: "/admin/artist", tag: "Admin", summary: "Delete an artist", admin: true, query: ["id", "force"], response: "EmptyObject" },
	{ method: "post", path: "/admin/album", tag: "Admin", summary: "Create an album", admin: true, body: "multipart", response: "Album", status: 201 },
	{ method: "patch", path: "/admin/album", tag: "Admin", summary: "Update an album", admin: true, query: ["id"], body: "multipart", response: "Album" },
	{ method: "delete", path: "/admin/album", tag: "Admin", summary: "Delete an album", admin: true, query: ["id", "force"], response: "EmptyObject" },
	{ method: "post", path: "/admin/genre", tag: "Admin", summary: "Create a genre", admin: true, body: "json", response: "Genre", status: 201 },
	{ method: "patch", path: "/admin/genre", tag: "Admin", summary: "Update a genre", admin: true, query: ["id"], body: "json", response: "Genre" },
	{ method: "delete", path: "/admin/genre", tag: "Admin", summary: "Delete a genre", admin: true, query: ["id", "force"], response: "EmptyObject" },
	{ method: "post", path: "/admin/track", tag: "Admin", summary: "Create a track", admin: true, body: "multipart", response: "Track", status: 201 },
	{ method: "patch", path: "/admin/track", tag: "Admin", summary: "Update a track", admin: true, query: ["id"], body: "multipart", response: "Track" },
	{ method: "delete", path: "/admin/track", tag: "Admin", summary: "Delete a track", admin: true, query: ["id"], response: "EmptyObject" },
]

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const jsonResponse = (description: string, schema?: unknown) => ({
	description,
	...(schema ? { content: { "application/json": { schema } } } : {}),
})
const fieldTypes: Record<string, unknown> = {
	id: { type: "string", description: "MongoDB ObjectId" },
	ids: {
		anyOf: [
			{ type: "string", description: "One MongoDB ObjectId" },
			{ type: "array", items: { type: "string" }, description: "Repeated query parameter values" },
		],
		description: "A single ID or repeated ids query parameters; comma-separated values are not accepted.",
	},
	limit: { type: "integer", minimum: 1 },
	skip: { type: "integer", minimum: 0 },
	q: { type: "string" },
	type: { type: "string", enum: ["track", "album", "artist", "default"] },
	force: { type: "boolean" },
}

function operationSpec(operation: ApiOperation) {
	const pathParams = [...operation.path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1])
	const parameters = [
		...pathParams.map((name) => ({ name, in: "path", required: true, schema: { type: "string" } })),
		...(operation.path === "/auth/session" && operation.method === "post"
			? [{ name: "refreshToken", in: "cookie", required: false, schema: { type: "string" } }]
			: []),
		...(operation.query ?? []).map((name) => ({
			name,
			in: "query",
			required: name === "q" || name === "ids" || name === "id" || (name === "force" && operation.path === "/admin/genre"),
			schema: fieldTypes[name] ?? { type: "string" },
			...(name === "ids" ? { style: "form", explode: true } : {}),
		})),
	]
	const bodySchema = operation.body === "json"
		? operation.path === "/auth/register"
			? { type: "object", required: ["name", "email", "password"], properties: { name: { type: "string" }, email: { type: "string", format: "email" }, password: { type: "string", minLength: 8 } } }
			: operation.path === "/auth/signin"
				? { type: "object", required: ["email", "password"], properties: { email: { type: "string", format: "email" }, password: { type: "string" }, remember: { type: "boolean", description: "When true, makes the refresh cookie persistent for 30 days." } } }
				: operation.path === "/auth/session"
					? { type: "object", required: ["refreshToken"], properties: { refreshToken: { type: "string" } } }
					: { type: "object", ...(operation.method === "post" ? { required: ["name"] } : {}), properties: { name: { type: "string" } } }
		: operation.body === "multipart"
			? operation.path === "/admin/artist"
				? { type: "object", properties: { name: { type: "string" }, file: { type: "string", format: "binary" } }, ...(operation.method === "post" ? { required: ["name", "file"] } : {}) }
				: operation.path === "/admin/album"
					? { type: "object", properties: { name: { type: "string" }, artists: { type: "array", items: { type: "string" }, description: "Comma-separated MongoDB ObjectIds" }, genre: { type: "string" }, file: { type: "string", format: "binary" } }, ...(operation.method === "post" ? { required: ["name", "artists", "genre", "file"] } : {}) }
					: { type: "object", properties: { name: { type: "string" }, album: { type: "string" }, artists: { type: "array", items: { type: "string" }, description: "Comma-separated MongoDB ObjectIds" }, file: { type: "string", format: "binary" }, lyrics: { oneOf: [ref("Lyrics"), { type: "string" }] } }, ...(operation.method === "post" ? { required: ["name", "album", "artists", "file"] } : {}) }
		: undefined
	const responses: Record<string, unknown> = {
		[operation.status ?? 200]: jsonResponse(
			operation.path === "/tracks/{id}/lyrics"
				? "Returns the lyrics object when present. The handler returns an empty body when the track exists without lyrics, and an empty object when the track does not exist."
				: "Successful response",
			operation.response ? ref(operation.response) : undefined,
		),
		...(pathParams.length || operation.query?.length || operation.body
			? { 400: jsonResponse("Invalid request", ref("InvalidRequest")) }
			: {}),
		...(operation.auth || operation.admin || (operation.path === "/auth/session" && operation.method === "post")
			? {
				401: jsonResponse(
					"Authentication required",
					ref(operation.auth || operation.admin ? "UnauthorizedError" : "Error"),
				),
			}
			: {}),
		...(operation.path === "/user/tracks" || (operation.path.startsWith("/admin/") && (operation.method === "patch" || operation.method === "delete"))
			? { 404: jsonResponse("Resource not found", ref("NotFound")) }
			: {}),
		...(operation.path === "/admin/track" && operation.method === "post"
			? { 500: jsonResponse("Track processing failed") }
			: {}),
		...(operation.method === "delete" && operation.path !== "/admin/track"
			? { 409: jsonResponse("Resource has dependents", ref("DependentError")) }
			: {}),
	}
	return {
		tags: [operation.tag],
		summary: operation.summary,
		...(operation.auth || operation.admin ? { security: [{ Bearer: [] }, { SessionCookie: [] }] } : {}),
		...(parameters.length ? { parameters } : {}),
		...(operation.body
			? {
				requestBody: {
					required: operation.path !== "/auth/session",
					...(operation.path === "/auth/session" ? { description: "May be omitted when the refreshToken HttpOnly cookie is present." } : {}),
					content: {
						[operation.body === "json" ? "application/json" : "multipart/form-data"]: {
							schema: bodySchema,
						},
					},
				},
			}
			: {}),
		responses,
	}
}

const paths: Record<string, Record<string, unknown>> = {}
for (const operation of operations) {
	const pathItem = paths[operation.path] ?? {}
	pathItem[operation.method] = operationSpec(operation)
	paths[operation.path] = pathItem
}

export const openApiDocument = {
	openapi: "3.1.0",
	info: { title: "MusicBackend", version: "v2" },
	servers: [{ url: "/api", description: "Nuxt API routes" }],
	tags: ["Auth", "Artist", "Album", "Genre", "Track", "All", "Search", "User", "Admin"].map((name) => ({ name })),
	paths,
	components: {
		securitySchemes: {
			Bearer: { type: "http", scheme: "bearer" },
			SessionCookie: { type: "apiKey", in: "cookie", name: "musicSession" },
		},
		schemas: {
			Error: { type: "object", required: ["message"], properties: { message: { type: "string" } } },
			UnauthorizedError: {
				type: "object",
				required: ["statusCode", "statusMessage", "data"],
				properties: {
					statusCode: { type: "integer", enum: [401] },
					statusMessage: { type: "string", enum: ["Unauthorized"] },
					data: ref("Error"),
				},
			},
			InvalidRequest: { oneOf: [ref("Error"), ref("H3Error")] },
			H3Error: {
				type: "object",
				required: ["statusCode", "statusMessage"],
				properties: {
					statusCode: { type: "integer" },
					statusMessage: { type: "string" },
					message: { type: "string" },
					data: {},
				},
			},
			Signout: { type: "object", properties: { success: { type: "boolean" } } },
			ArtistOrNull: { anyOf: [ref("Artist"), { type: "null" }] },
			AlbumOrNull: { anyOf: [ref("Album"), { type: "null" }] },
			TrackOrNull: { anyOf: [ref("Track"), { type: "null" }] },
			EmptyObject: { type: "object", properties: {}, additionalProperties: false },
			NotFound: { oneOf: [ref("Error"), ref("EmptyObject")] },
			DependentError: {
				type: "object",
				required: ["message", "dependentType", "dependents"],
				properties: {
					message: { type: "string" },
					dependentType: { type: "string" },
					dependents: { type: "array", items: { type: "object", properties: { _id: { type: "string" }, name: { type: "string" } } } },
				},
			},
			Artist: { type: "object", properties: { _id: { type: "string" }, name: { type: "string" }, file: { type: "string" } } },
			Genre: { type: "object", properties: { _id: { type: "string" }, name: { type: "string" } } },
			Album: {
				type: "object",
				properties: {
					_id: { type: "string" },
					name: { type: "string" },
					artists: { type: "array", items: { anyOf: [{ type: "string", description: "MongoDB ObjectId" }, ref("Artist")] } },
					file: { type: "string" },
					genre: { anyOf: [{ type: "string", description: "MongoDB ObjectId" }, ref("Genre")] },
				},
			},
			Lyrics: { type: "object", properties: { synced: { type: "boolean" }, text: { type: "string" } } },
			Track: {
				type: "object",
				properties: {
					_id: { type: "string" },
					name: { type: "string" },
					album: { anyOf: [{ type: "string", description: "MongoDB ObjectId" }, ref("Album")] },
					artists: { type: "array", items: { anyOf: [{ type: "string", description: "MongoDB ObjectId" }, ref("Artist")] } },
					fileDir: { type: "string" },
					durationInSeconds: { type: "number" },
					lyrics: ref("Lyrics"),
				},
			},
			User: { type: "object", properties: { _id: { type: "string" }, name: { type: "string" }, email: { type: "string", format: "email" }, role: { type: "string" }, verified: { type: "boolean" }, savedTracks: { type: "array", items: { type: "string", description: "MongoDB ObjectId" } } } },
			Session: { type: "object", properties: { sessionToken: { type: "string" }, expireAt: { type: "string", format: "date-time" } } },
			SessionStatus: { type: "object", properties: { authenticated: { type: "boolean" }, sessionToken: { type: "string" } } },
			SearchResults: { type: "object", properties: { tracks: { type: "array", items: ref("Track") }, albums: { type: "array", items: ref("Album") }, artists: { type: "array", items: ref("Artist") } } },
			ArtistList: { type: "array", items: ref("Artist") },
			GenreList: { type: "array", items: ref("Genre") },
			AlbumList: { type: "array", items: ref("Album") },
			TrackList: { type: "array", items: ref("Track") },
		},
	},
}
