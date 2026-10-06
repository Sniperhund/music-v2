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
	modules: ["@nuxt/fonts", "@nuxt/icon", "@nuxt/image", "@vite-pwa/nuxt"],
	pwa: {
		strategies: "injectManifest",
		srcDir: "../public",
		filename: "sw.js",
		registerType: "autoUpdate",
		registerWebManifestInRouteRules: true,
		injectManifest: {
			injectionPoint: undefined,
		},
		devOptions: {
			enabled: false,
		},
		manifest: {
			id: "/",
			name: "Music",
			short_name: "Music",
			description: "Your personal music library and player.",
			start_url: "/",
			scope: "/",
			display: "standalone",
			background_color: "#09090b",
			theme_color: "#09090b",
			categories: ["music", "entertainment"],
			icons: [
				{
					src: "/icons/pwa-192.png",
					sizes: "192x192",
					type: "image/png",
				},
				{
					src: "/icons/pwa-512.png",
					sizes: "512x512",
					type: "image/png",
				},
				{
					src: "/icons/pwa-maskable-512.png",
					sizes: "512x512",
					type: "image/png",
					purpose: "maskable",
				},
			],
		},
	},
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
