type DeleteOptions = {
	endpoint: string
	type: string
	id: string
	name: string
	refresh: () => Promise<unknown>
}

export const useAdminDelete = () => {
	const toast = useToast()

	return async ({ endpoint, type, id, name, refresh }: DeleteOptions) => {
		if (!window.confirm(`Delete ${type.toLowerCase()} “${name}”?`)) return

		try {
			await cfetch(endpoint, {
				method: "DELETE",
				params: { id, force: false },
			})
		} catch (error: any) {
			const responseData = error?.data ?? error?.response?._data
			if (error?.response?.status !== 409 || !responseData?.dependentType) {
				toast.show(`Failed to delete ${type.toLowerCase()}`, "error")
				return
			}

			const dependents = Array.isArray(responseData.dependents)
				? responseData.dependents
				: []
			const dependentNames = dependents
				.map((dependent: { name?: string }) => dependent.name)
				.filter(Boolean)
				.slice(0, 8)
				.join("\n• ")
			const details = dependentNames ? `\n\n• ${dependentNames}` : ""
			const more = dependents.length > 8 ? `\n• and ${dependents.length - 8} more` : ""
			const confirmed = window.confirm(
				`${type} “${name}” has ${dependents.length} dependent ${responseData.dependentType.toLowerCase()} record(s). Force delete it and its dependents?${details}${more}`,
			)
			if (!confirmed) return

			try {
				await cfetch(endpoint, {
					method: "DELETE",
					params: { id, force: true },
				})
			} catch {
				toast.show(`Failed to delete ${type.toLowerCase()}`, "error")
				return
			}
		}

		toast.show(`${type} deleted successfully`, "success")
		await refresh()
	}
}
