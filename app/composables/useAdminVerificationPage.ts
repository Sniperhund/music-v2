import type { TrackPage } from "@/utils/types"

export const useAdminVerificationPage = (path: string) => {
	const page = ref(0)
	const pageSize = 25
	const requestUrl = computed(
		() => `${path}?limit=${pageSize}&skip=${page.value * pageSize}`,
	)
	const { data, status, error } = useApiFetch<TrackPage>(requestUrl)
	const tracks = computed(() => data.value?.tracks ?? [])
	const total = computed(() => data.value?.total ?? 0)
	const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
	watch(totalPages, (pages) => {
		if (page.value >= pages) page.value = pages - 1
	})
	const previousPage = () => {
		page.value = Math.max(0, page.value - 1)
	}
	const nextPage = () => {
		if (page.value + 1 < totalPages.value) page.value += 1
	}

	return { page, pageSize, status, error, tracks, total, totalPages, previousPage, nextPage }
}
