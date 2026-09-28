export const BACKEND_SERVE = "/static/"

export const GET_FILE = (file: string) => `${BACKEND_SERVE}${file}`
export const GET_AUDIO_FILE = (file: string) => {
	return `${GET_FILE(file)}/high.m4a`
}
