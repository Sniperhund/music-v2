import type { LyricsVerificationStatus, Track, VerificationStatus } from "@/utils/types"
import { clearRequestCache } from "@/utils/requestCache"
import type { DropdownMenuItem } from "~/ui/DropdownMenu.vue"

export const useTrackVerification = (getTrack: () => Track | undefined) => {
	const { data: user } = useApiFetch<{ role?: string }>("/user")
	const toast = useToast()
	const song = ref<VerificationStatus>(getTrack()?.verification?.song ?? "undecided")
	const lyrics = ref<LyricsVerificationStatus>(getTrack()?.verification?.lyrics ?? "undecided")
	const album = ref<VerificationStatus>(getTrack()?.album.verification ?? "undecided")

	watch(
		() => getTrack(),
		(track) => {
			if (!track) return
			song.value = track.verification?.song ?? "undecided"
			lyrics.value = track.verification?.lyrics ?? "undecided"
			album.value = track.album.verification ?? "undecided"
		},
	)

	const save = async (
		target: "song" | "lyrics" | "album",
		status: VerificationStatus | "approved-with-changes",
	) => {
		const track = getTrack()
		if (!track) return
		try {
			await $fetch("/api/admin/verification", {
				method: "PATCH",
				query: { id: target === "album" ? track.album._id : track._id },
				body: { target, status },
			})
			if (target === "song") song.value = status as VerificationStatus
			else if (target === "lyrics") lyrics.value = status
			else album.value = status as VerificationStatus
			const isApproved = (value: string) => value === "approved" || value === "approved-with-changes"
			const fullyApproved =
				isApproved(target === "song" ? status : song.value) &&
				isApproved(target === "lyrics" ? status : lyrics.value) &&
				isApproved(target === "album" ? status : album.value)
			clearRequestCache()
			await refreshNuxtData()
			toast.show(
				fullyApproved
					? "Track is fully approved and now appears under Verified Tracks"
					: target === "lyrics" && status === "approved-with-changes"
						? "Lyrics approved with minor changes required"
						: `${target === "song" ? "Track" : target === "lyrics" ? "Lyrics" : "Album"} ${status}`,
			)
		} catch {
			toast.show("Could not update verification", "error")
		}
	}

	const decisionItems = (target: "song" | "lyrics" | "album") => [
		{ label: "Approve", icon: "lucide:badge-check", keepOpen: true, onSelect: () => save(target, "approved") },
		{ label: "Deny", icon: "lucide:ban", keepOpen: true, onSelect: () => save(target, "denied") },
	]
	const lyricsDecisionItems = [
		{ label: "Approve", icon: "lucide:badge-check", keepOpen: true, onSelect: () => save("lyrics", "approved") },
		{ label: "Approve, minor changes required", icon: "lucide:badge-alert", keepOpen: true, onSelect: () => save("lyrics", "approved-with-changes") },
		{ label: "Deny", icon: "lucide:ban", keepOpen: true, onSelect: () => save("lyrics", "denied") },
	]
	const denyLyricsItem = {
		label: "Deny",
		icon: "lucide:ban",
		keepOpen: true,
		onSelect: () => save("lyrics", "denied"),
	}

	const items = computed<DropdownMenuItem[][]>(() => {
		if (user.value?.role !== "admin") return []
		const track = getTrack()
		if (!track) return []
		return [[
			{ label: `Track: ${song.value}`, icon: "lucide:music-2", children: decisionItems("song") },
			{
				label: `Lyrics: ${track.lyrics ? lyrics.value : `No lyrics (${lyrics.value})`}`,
				icon: "lucide:align-left",
				children: track.lyrics?.synced
					? lyricsDecisionItems
					: [denyLyricsItem],
			},
			{ label: `Album: ${album.value}`, icon: "lucide:disc-3", children: decisionItems("album") },
		]]
	})

	return { items }
}
