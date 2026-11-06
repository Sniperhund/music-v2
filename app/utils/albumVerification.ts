import type { VerificationStatus } from "@/utils/types"

interface AlbumVerificationSummary {
	verification?: VerificationStatus
	approvedTrackCount?: number
	partiallyApprovedTrackCount?: number
	unapprovedTrackCount?: number
	deniedTrackCount?: number
}

export type AlbumVerificationState = "approved" | "undecided" | "partial" | "mixed" | "unapproved" | "denied"

export const getAlbumVerificationState = (summary: AlbumVerificationSummary): AlbumVerificationState => {
	if (summary.verification === "denied") return "denied"
	const approved = summary.approvedTrackCount ?? 0
	const partial = summary.partiallyApprovedTrackCount ?? 0
	const unapproved = summary.unapprovedTrackCount ?? 0
	const total = approved + partial + unapproved

	if ((summary.deniedTrackCount ?? 0) > 0) return "unapproved"
	if (total > 0 && approved === total) return "approved"
	return "undecided"
}

const countLabel = (count: number, singular: string, plural: string) =>
	`${count} ${count === 1 ? singular : plural}`

export const formatAlbumVerificationTooltip = (summary: AlbumVerificationSummary) => {
	const parts: string[] = []
	const partialCount = summary.partiallyApprovedTrackCount ?? 0
	const approvedCount = summary.approvedTrackCount ?? 0
	const unapprovedCount = summary.unapprovedTrackCount ?? 0
	const hasTrackProblems = partialCount > 0 || unapprovedCount > 0

	if (partialCount) parts.push(`${countLabel(partialCount, "track", "tracks")} partially approved`)
	if (approvedCount) parts.push(`${countLabel(approvedCount, "track", "tracks")} approved`)
	if (unapprovedCount) parts.push(`${countLabel(unapprovedCount, "track", "tracks")} not approved`)
	if (summary.verification === "denied") parts.push("Album denied")
	else if (summary.verification !== "approved" && !hasTrackProblems) parts.push("Album not reviewed")

	return parts.join(" · ")
}
