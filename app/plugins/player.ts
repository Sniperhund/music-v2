import { Howl } from "howler"

export default defineNuxtPlugin((nuxtApp) => {
	const sound = ref<Howl | null>(null)
	const queue = ref<Track[]>([])
	const prevQueue = ref<Track[]>([])
	const currentQueue = ref<Track[]>([])
	const currentSong = ref<Track | null>(null)
	const repeat = ref(false)
	const isPlaying = ref(false)

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
			return sound.value?.volume() ?? 1
		},
		set(value) {
			sound.value?.volume(value)
		},
	})
	const duration = ref(0)

	const aniFrame = ref<number | null>(null)

	// Helpers
	const updateMediaSession = async () => {
		if (!import.meta.client) return
		if (!navigator.mediaSession) {
			console.warn("Media Session API is not supported")
			return
		}

		if (!currentSong.value) return

		navigator.mediaSession.metadata = new MediaMetadata({
			title: currentSong.value.name,
			artist: currentSong.value.artists[0]?.name,
			album: currentSong.value.album.name,
			artwork: [
				{
					src: GET_FILE(currentSong.value.album.file),
					sizes: "512x512",
				},
			],
		})

		navigator.mediaSession.setPositionState({
			duration: duration.value,
			position: secondsPlayed.value,
		})
	}

	const startTracking = () => {
		const update = () => {
			tick.value++
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
			src: [GET_AUDIO_FILE(song.fileDir)],
			html5: false,
			autoplay: false,
			volume: 0.5,
			onload: () => {
				duration.value = sound.value?.duration() || 0
				volume.value = sound.value?.volume() || 1
			},
			onend: () => {
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

	const next = async () => {
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

		if (currentSong.value) await play()

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

	const clear = () => {
		queue.value = []
		currentQueue.value = []
		currentSong.value = null
		sound.value?.stop()
		sound.value = null
	}

	const shuffle = () => {
		queue.value.sort(() => Math.random() - 0.5)
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
				clear,
				shuffle,
				getDuration,
				secondsPlayed,
				duration,
				volume,
				queue,
			},
		},
	}
})
