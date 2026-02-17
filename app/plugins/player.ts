import { Howl } from "howler"

export default defineNuxtPlugin((nuxtApp) => {
	const sound = ref<Howl | null>(null)
	const queue = ref<Track[]>([])
	const prevQueue = ref<Track[]>([])
	const currentQueue = ref<Track[]>([])
	const currentSong = ref<Track | null>(null)
	const repeat = ref(false)
	const isPlaying = ref(false)

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
			duration: await getDuration(),
			position: getSecondsPlayed(),
		})
	}

	const createHowl = async (song: Track) => {
		if (!import.meta.client) return
		if (!song) throw new Error("Song not provided")

		const newSound = new Howl({
			src: [GET_AUDIO_FILE(song.fileDir)],
			html5: true,
			autoplay: false,
			volume: 0.5,
			onend: () => {
				next()
			},
			onstop: () => {
				isPlaying.value = false
				if (navigator.mediaSession)
					navigator.mediaSession.playbackState = "none"
			},
			onplay: () => {
				isPlaying.value = true
				if (navigator.mediaSession)
					navigator.mediaSession.playbackState = "playing"
			},
			onpause: () => {
				isPlaying.value = false
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

	const getSecondsPlayed = () => sound.value?.seek() || 0
	const setSecondsPlayed = (s: number) => sound.value?.seek(s)
	const setVolume = (v: number) => sound.value?.volume(v)
	const getVolume = () => sound.value?.volume() || 0

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
				getDuration,
				getSecondsPlayed,
				setSecondsPlayed,
				setVolume,
				getVolume,
				queue,
			},
		},
	}
})
