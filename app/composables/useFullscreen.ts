type FullscreenState = ReturnType<typeof useState<boolean>>

type FullscreenControls = {
	fullscreen: FullscreenState
	open: () => Promise<boolean>
	close: () => Promise<boolean>
	toggle: () => Promise<boolean>
}

const syncFullscreenState = (fullscreen: FullscreenState) => {
	fullscreen.value = Boolean(document.fullscreenElement)
}

let fullscreenListenerInstalled = false

export const useFullscreen = () => {
	const fullscreen = useState<boolean>("fullscreen", () => false)

	const open = async () => {
		fullscreen.value = true

		if (!import.meta.client) return true
		if (!document.documentElement.requestFullscreen) return true

		try {
			await document.documentElement.requestFullscreen()
			return true
		} catch {
			fullscreen.value = false
			return false
		}
	}

	const close = async () => {
		if (import.meta.client && document.fullscreenElement) {
			try {
				await document.exitFullscreen()
			} catch {
				// Fall through to keep the app state consistent.
			}
		}

		fullscreen.value = false
		return true
	}

	const toggle = async () => {
		if (fullscreen.value) return close()
		return open()
	}

	if (import.meta.client && !fullscreenListenerInstalled) {
		fullscreenListenerInstalled = true
		document.addEventListener("fullscreenchange", () => {
			syncFullscreenState(fullscreen)
		})
		syncFullscreenState(fullscreen)
	}

	return {
		fullscreen,
		open,
		close,
		toggle,
	} as FullscreenControls
}
