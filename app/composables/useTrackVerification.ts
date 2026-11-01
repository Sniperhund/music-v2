import type { Track, VerificationStatus } from "@/utils/types"
import type { DropdownMenuItem } from "~/ui/DropdownMenu.vue"

export const useTrackVerification = (getTrack: () => Track | undefined) => {
	const { data: user } = useApiFetch<{ role?: string }>("/user")
	const toast = useToast()
	const song = ref<VerificationStatus>(getTrack()?.verification?.song ?? "undecided")
	const lyrics = ref<VerificationStatus>(getTrack()?.verification?.lyrics ?? "undecided")
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
		status: VerificationStatus,
	) => {
		const track = getTrack()
		if (!track) return
		try {
			await $fetch("/api/admin/verification", {
				method: "PATCH",
				query: { id: target === "album" ? track.album._id : track._id },
				body: { target, status },
			})
			if (target === "song") song.value = status
			else if (target === "lyrics") lyrics.value = status
			else album.value = status
			const fullyApproved =
				(target === "song" ? status : song.value) === "approved" &&
				(target === "lyrics" ? status : lyrics.value) === "approved" &&
				(target === "album" ? status : album.value) === "approved"
			await refreshNuxtData()
			toast.show(
				fullyApproved
					? "Track is fully approved and now appears under Verified Tracks"
					: `${target === "song" ? "Track" : target === "lyrics" ? "Lyrics" : "Album"} ${status}`,
			)
		} catch {
			toast.show("Could not update verification", "error")
		}
	}

	const acceptAll = async () => {
		const track = getTrack()
		if (!track) return
		try {
			await $fetch("/api/admin/verification", {
				method: "PATCH",
				query: { id: track._id },
				body: { target: "all", status: "approved" },
			})
			song.value = "approved"
			lyrics.value = "approved"
			album.value = "approved"
			await refreshNuxtData()
			toast.show("Song, lyrics, and album approved")
		} catch {
			toast.show("Could not approve all verification", "error")
		}
	}

	const decisionItems = (target: "song" | "lyrics" | "album") => [
		{ label: "Approve", icon: "lucide:badge-check", keepOpen: true, onSelect: () => save(target, "approved") },
		{ label: "Deny", icon: "lucide:ban", keepOpen: true, onSelect: () => save(target, "denied") },
	]
	const missingLyricsItems = [
		{ label: "Confirm no lyrics", icon: "lucide:badge-check", keepOpen: true, onSelect: () => save("lyrics", "approved") },
		{ label: "Deny", icon: "lucide:ban", keepOpen: true, onSelect: () => save("lyrics", "denied") },
	]

	const items = computed<DropdownMenuItem[][]>(() => {
		if (user.value?.role !== "admin") return []
		const track = getTrack()
		if (!track) return []
		return [[
			{ label: "Accept all", icon: "lucide:badge-check", onSelect: acceptAll },
			{ label: "Approve track", icon: "lucide:badge-check", keepOpen: true, onSelect: () => save("song", "approved") },
			{ label: "Disapprove track", icon: "lucide:badge-x", keepOpen: true, onSelect: () => save("song", "denied") },
			{ label: `Track: ${song.value}`, icon: "lucide:music-2", children: decisionItems("song") },
			track.lyrics
				? { label: `Lyrics: ${lyrics.value}`, icon: "lucide:align-left", children: decisionItems("lyrics") }
				: { label: `Lyrics: No lyrics (${lyrics.value})`, icon: "lucide:align-left", children: missingLyricsItems },
			{ label: `Album: ${album.value}`, icon: "lucide:disc-3", children: decisionItems("album") },
		]]
	})

	return { items }
}
