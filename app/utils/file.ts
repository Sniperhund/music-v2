export const GET_FILE = (file: string, baseUrl = useRuntimeConfig().public.mediaBaseUrl) => {
	return `${String(baseUrl).replace(/\/+$/, "")}/${file.replace(/^\/+/, "")}`
}

export const GET_AUDIO_FILE = (file: string, baseUrl?: string) => {
	return GET_FILE(`${file}/high.m4a`, baseUrl)
}
