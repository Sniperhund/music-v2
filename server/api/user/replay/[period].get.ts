import { createError, getRouterParam } from "h3"
import { getReplayStats } from "#server/utils/replay"
import { defineAuthenticatedEventHandler, requireAuthenticatedUser } from "#server/utils/auth"

export default defineAuthenticatedEventHandler(async (event) => {
	const user = await requireAuthenticatedUser(event)
	const period = getRouterParam(event, "period") ?? ""
	if (period === "all-time") return { period, title: "All Time", ...(await getReplayStats(user._id)) }
	if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
		throw createError({ statusCode: 400, statusMessage: "Invalid replay period" })
	}

	const year = Number(period.slice(0, 4))
	const month = Number(period.slice(5, 7))
	const from = new Date(Date.UTC(year, month - 1, 1))
	const to = new Date(Date.UTC(year, month, 1))
	const monthName = new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(from)
	const title = `${monthName}, ${year}`
	return { period, title, ...(await getReplayStats(user._id, { from, to })) }
})
