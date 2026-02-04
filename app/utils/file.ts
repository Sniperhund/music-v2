export const BACKEND_SERVE = `${import.meta.env.VITE_PUBLIC_BACKEND}/static/`

export const GET_FILE = (file: string) => `${BACKEND_SERVE}${file}`
