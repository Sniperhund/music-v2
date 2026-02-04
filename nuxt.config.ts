import { fileURLToPath } from "node:url"

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",
	devtools: { enabled: true },
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
	image: {
		domains: ["api.music.lucasskt.dk"],
	},
})
