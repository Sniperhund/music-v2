import { defineConfig } from "golar/unstable"

import "@golar/vue"

export default defineConfig({
	typecheck: {
		include: ["app/**/*.{ts,tsx,vue}", "server/**/*.ts", "nuxt.config.ts"],
	},
})
