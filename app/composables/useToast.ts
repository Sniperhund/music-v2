type Toast = {
	id: number
	message: string
	type?: "success" | "error" | "info"
}

const toasts = ref<Toast[]>([])

export const useToast = () => {
	const show = (
		message: string,
		type: Toast["type"] = "info",
		duration = 5 * 1000
	): number => {
		const id = toasts.value.length + 1
		toasts.value.push({ id, message, type })

		setTimeout(() => {
			remove(id)
		}, duration)

		return id
	}

	const remove = (id: number) => {
		toasts.value = toasts.value.filter((t) => t.id != id)
	}

	return { toasts, show, remove }
}
