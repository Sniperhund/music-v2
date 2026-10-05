import { cfetch } from "@/utils/cfetch"
import { toValue, type MaybeRefOrGetter } from "vue"

interface TrackMembership {
	contains: boolean
}

export const useTrackLibrary = (trackId: MaybeRefOrGetter<string | undefined>) => {
	const toast = useToast()
	const isSaved = ref<boolean | null>(null)
	const saving = ref(false)

	const checkMembership = async () => {
		const id = toValue(trackId)
		if (!id) return

		try {
			const result = await cfetch<TrackMembership>("/user/tracks/contains", {
				params: { id },
			})
			isSaved.value = result.contains
		} catch (error: any) {
			toast.show(
				error?.data?.message || "Could not check Library status",
				"error",
			)
		}
	}

	onMounted(checkMembership)

	const toggleSaved = async () => {
		const id = toValue(trackId)
		if (!id || isSaved.value === null || saving.value) return false

		const wasSaved = isSaved.value
		saving.value = true
		try {
			await cfetch("/user/tracks", {
				method: wasSaved ? "DELETE" : "PATCH",
				params: { id },
			})
			isSaved.value = !wasSaved
			toast.show(
				wasSaved ? "Removed from Library" : "Saved to Library",
				"success",
			)
			return wasSaved
		} catch (error: any) {
			toast.show(
				error?.data?.message ||
					(wasSaved
						? "Could not remove song from Library"
						: "Could not save song to Library"),
				"error",
			)
			return false
		} finally {
			saving.value = false
		}
	}

	return { isSaved, saving, toggleSaved }
}
