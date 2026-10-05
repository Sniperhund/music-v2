import { fileURLToPath } from "node:url"

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",
	nitro: {
		preset: "node-server",
		externals: {
			inline: ["vue"],
		},
	},
	devtools: { enabled: true },
	runtimeConfig: {
		// Private server configuration. Matching NUXT_* variables override these
		// defaults at runtime in the built Nitro server. Legacy variable names
		// are resolved by server utilities at runtime, never during this build.
		mongodbUri: "",
		tokenExpire: "",
		s3Endpoint: "",
		s3Bucket: "",
		s3Region: "us-east-1",
		s3AccessKeyId: "",
		s3SecretAccessKey: "",
		public: {
			mediaBaseUrl: "",
		},
	},
	modules: ["@nuxt/fonts", "@nuxt/icon", "@nuxt/image"],
	components: [
		{
			path: "~/ui",
			pathPrefix: false,
		},
		{
			path: "~/components",
			pathPrefix: true,
		},
	],
})
