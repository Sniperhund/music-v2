export type ReplayGradient = "gold" | "pink" | "orange" | "green" | "blue"

const replayGradients: ReplayGradient[] = ["gold", "pink", "orange", "green", "blue"]

export const getReplayGradient = (period: string): ReplayGradient => {
	if (period === "all-time") return "gold"
	const year = Number(period.slice(0, 4))
	const month = Number(period.slice(5, 7))
	if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return "gold"
	return replayGradients[(year * 12 + month) % replayGradients.length] ?? "gold"
}
