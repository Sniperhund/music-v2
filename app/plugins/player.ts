import { Howl } from "howler"

export default defineNuxtPlugin((nuxtApp) => {
	const mediaBaseUrl = useRuntimeConfig().public.mediaBaseUrl
	const { close: closeFullscreen } = useFullscreen()
	const VOLUME_STORAGE_KEY = "music-v2-player-volume"
	const DEFAULT_VOLUME = 0.5

	const sound = ref<Howl | null>(null)
	const queue = ref<Track[]>([])
	const prevQueue = ref<Track[]>([])
	const currentQueue = ref<Track[]>([])
	const currentSong = ref<Track | null>(null)
	const repeat = ref(false)
	const isPlaying = ref(false)
	const storedVolume = ref(DEFAULT_VOLUME)

	const clampVolume = (value: number) => Math.min(1, Math.max(0, value))

	const readStoredVolume = () => {
		if (!import.meta.client) return DEFAULT_VOLUME

		const rawVolume = window.localStorage.getItem(VOLUME_STORAGE_KEY)
		if (rawVolume === null) return DEFAULT_VOLUME

		const parsedVolume = Number(rawVolume)
		if (Number.isNaN(parsedVolume)) return DEFAULT_VOLUME

		return clampVolume(parsedVolume)
	}

	if (import.meta.client) {
		storedVolume.value = readStoredVolume()

		watch(storedVolume, (value) => {
			window.localStorage.setItem(VOLUME_STORAGE_KEY, String(value))
		})
	}

	const tick = ref(0)

	const secondsPlayed = computed<number>({
		get() {
			tick.value
			return (sound.value?.seek() as number) || 0
		},
		set(value: number) {
			sound.value?.seek(value)
		},
	})
	const volume = computed<number>({
		get() {
			tick.value
			return storedVolume.value
		},
		set(value) {
			const nextVolume = clampVolume(value)
			storedVolume.value = nextVolume
			sound.value?.volume(nextVolume)
		},
	})
	const duration = ref(0)
	let lastPositionUpdate = 0
	let mediaSessionSongId: string | null = null

	const aniFrame = ref<number | null>(null)

	// Helpers
	const updateMediaSession = () => {
		if (!import.meta.client) return
		const mediaSession = navigator.mediaSession
		if (!mediaSession) return

		if (!currentSong.value) {
			mediaSession.metadata = null
			mediaSession.playbackState = "none"
			mediaSessionSongId = null
			return
		}

		if (mediaSessionSongId !== currentSong.value._id) {
			mediaSession.metadata = new MediaMetadata({
				title: currentSong.value.name,
				artist: currentSong.value.artists[0]?.name,
				album: currentSong.value.album.name,
				artwork: [
					{
						src: GET_FILE(currentSong.value.album.file, mediaBaseUrl),
						sizes: "512x512",
					},
				],
			})
			mediaSessionSongId = currentSong.value._id
		}

		if (duration.value > 0) {
			try {
				mediaSession.setPositionState({
					duration: duration.value,
					position: Math.min(secondsPlayed.value, duration.value),
				})
			} catch {
				// Position state can be unavailable while media metadata is loading.
			}
		}
	}

	const registerMediaSessionActions = () => {
		if (!import.meta.client || !navigator.mediaSession) return

		const actions: MediaSessionAction[] = [
			"play",
			"pause",
			"nexttrack",
			"previoustrack",
			"seekto",
			"seekbackward",
			"seekforward",
		]

		for (const action of actions) {
			try {
				navigator.mediaSession.setActionHandler(action, (event) => {
					switch (action) {
						case "play":
							void play()
							break
						case "pause":
							pause()
							break
						case "nexttrack":
							void next()
							break
						case "previoustrack":
							void prev()
							break
						case "seekto":
							if (event.seekTime !== undefined)
								secondsPlayed.value = event.seekTime
							updateMediaSession()
							break
						case "seekbackward":
							secondsPlayed.value = Math.max(
								0,
								secondsPlayed.value - (event.seekOffset ?? 10),
							)
							updateMediaSession()
							break
						case "seekforward":
							secondsPlayed.value = Math.min(
								duration.value,
								secondsPlayed.value + (event.seekOffset ?? 10),
							)
							updateMediaSession()
					}
				})
			} catch {
				// Browsers may support Media Session without supporting every action.
			}
		}
	}

	const startTracking = () => {
		const update = () => {
			tick.value++
			const now = Date.now()
			if (now - lastPositionUpdate >= 1000) {
				lastPositionUpdate = now
				updateMediaSession()
			}
			aniFrame.value = requestAnimationFrame(update)
		}

		update()
	}

	const stopTracking = () => {
		if (aniFrame.value) cancelAnimationFrame(aniFrame.value)
		aniFrame.value = null
	}

	const createHowl = async (song: Track) => {
		if (!import.meta.client) return
		if (!song) throw new Error("Song not provided")

		const newSound = new Howl({
			src: [GET_AUDIO_FILE(song.fileDir, mediaBaseUrl)],
			html5: true,
			autoplay: false,
			volume: storedVolume.value,
			onload: () => {
				duration.value = sound.value?.duration() || 0
				sound.value?.volume(storedVolume.value)
				updateMediaSession()
			},
			onend: () => {
				void closeFullscreen()
				next()
				stopTracking()
			},
			onstop: () => {
				isPlaying.value = false
				stopTracking()
				if (navigator.mediaSession)
					navigator.mediaSession.playbackState = "none"
			},
			onplay: () => {
				isPlaying.value = true
				startTracking()
				if (navigator.mediaSession)
					navigator.mediaSession.playbackState = "playing"
			},
			onpause: () => {
				isPlaying.value = false
				stopTracking()
				if (navigator.mediaSession)
					navigator.mediaSession.playbackState = "paused"
			},
		})

		sound.value = newSound
		return newSound
	}

	// Core actions
	const play = async () => {
		if (!currentSong.value) await next()

		if (!sound.value && currentSong.value) {
			await createHowl(currentSong.value)
		}

		if (sound.value && !sound.value.playing()) {
			sound.value.play()
			isPlaying.value = true
		}

		updateMediaSession()
	}

	const pause = () => {
		sound.value?.pause()
		isPlaying.value = false
		updateMediaSession()
	}

	const next = async (autoplay: boolean = true) => {
		if (currentSong.value) {
			prevQueue.value.unshift(currentSong.value)
		}

		currentSong.value = queue.value.shift() || null

		sound.value?.stop()
		sound.value = null

		if (!currentSong.value && repeat.value) {
			queue.value = [...currentQueue.value]
			currentSong.value = queue.value.shift() || null
		}

		if (currentSong.value && autoplay) await play()

		updateMediaSession()
	}

	const prev = async () => {
		if (sound.value && sound.value.seek() > 5) {
			sound.value.seek(0)
			return
		}

		const prevSong = prevQueue.value.shift()
		if (!prevSong) return

		if (currentSong.value) queue.value.unshift(currentSong.value)

		currentSong.value = prevSong
		sound.value?.stop()
		sound.value = null

		if (currentSong.value) await play()

		updateMediaSession()
	}

	// Queue
	const addToQueue = (song: Track) => {
		queue.value.push(song)
		currentQueue.value.push(song)
	}

	const addToFrontOfQueue = (song: Track) => {
		queue.value.unshift(song)
		currentQueue.value.unshift(song)
	}

	const clear = () => {
		queue.value = []
		currentQueue.value = []
		currentSong.value = null
		sound.value?.stop()
		sound.value = null
		updateMediaSession()
	}

	if (import.meta.client) {
		registerMediaSessionActions()

		window.addEventListener("keydown", (event) => {
			if (
				event.defaultPrevented ||
				event.repeat ||
				event.ctrlKey ||
				event.metaKey ||
				event.altKey
			) return

			const target = event.target
			if (
				target instanceof HTMLElement &&
				target.closest(
					"input, textarea, select, button, [contenteditable='true'], [role='slider']",
				)
			) return

			switch (event.code) {
				case "Space":
					event.preventDefault()
					if (isPlaying.value) pause()
					else void play()
					break
				case "ArrowRight":
					event.preventDefault()
					void next()
					break
				case "ArrowLeft":
					event.preventDefault()
					void prev()
			}
		})
	}

	const shuffle = () => {
		queue.value.sort(() => Math.random() - 0.5)
	}

	// Album
	const playAlbum = async (songs: Track[]) => {
		clear()

		songs.forEach((song) => addToQueue(song))

		await next()
	}

	const playShuffledAlbum = async (songs: Track[]) => {
		clear()

		songs.forEach((song) => addToQueue(song))
		shuffle()

		await next()
	}

	const playAlbumAtIndex = async (songs: Track[], index: number) => {
		clear()
		songs.forEach((song) => addToQueue(song))

		for (let i = 0; i < index + 1; i++) {
			await next(false)
		}

		await play()
	}

	// Info
	const getDuration = () =>
		new Promise<number>((resolve) => {
			if (!sound.value) return resolve(0)
			if (sound.value.state() === "loaded") {
				resolve(sound.value.duration())
			} else {
				sound.value.once("load", () => resolve(sound.value!.duration()))
			}
		})

	return {
		provide: {
			player: {
				isPlaying,
				currentSong,
				repeat,
				play,
				pause,
				next,
				prev,
				addToQueue,
				addToFrontOfQueue,
				clear,
				shuffle,
				playAlbum,
				playShuffledAlbum,
				playAlbumAtIndex,
				getDuration,
				secondsPlayed,
				duration,
				volume,
				queue,
			},
		},
	}
})
