import { Howl, Howler } from "howler"
import { shapeBeatPulse } from "~/utils/beat"

export default defineNuxtPlugin((nuxtApp) => {
	const mediaBaseUrl = useRuntimeConfig().public.mediaBaseUrl
	const { close: closeFullscreen } = useFullscreen()
	if (import.meta.client) {
		const howlerInternal = Howler as unknown as {
			_obtainHtml5Audio: () => HTMLAudioElement
			_musicV2CorsEnabled?: boolean
		}
		if (!howlerInternal._musicV2CorsEnabled) {
			const obtainHtml5Audio = howlerInternal._obtainHtml5Audio
			howlerInternal._obtainHtml5Audio = function () {
				const audio = obtainHtml5Audio.call(Howler)
				audio.crossOrigin = "anonymous"
				return audio
			}
			howlerInternal._musicV2CorsEnabled = true
		}
	}
	const VOLUME_STORAGE_KEY = "music-v2-player-volume"
	const DEFAULT_VOLUME = 0.5
	const DEBUG_BEAT_ANALYSIS = false

	const sound = ref<Howl | null>(null)
	const queue = ref<Track[]>([])
	const prevQueue = ref<Track[]>([])
	const currentQueue = ref<Track[]>([])
	const currentSong = ref<Track | null>(null)
	const repeat = ref(false)
	const isPlaying = ref(false)
	const beatEnergy = ref(0)
	const storedVolume = ref(DEFAULT_VOLUME)
	type HowlWithMediaNode = Howl & {
		_sounds?: Array<{ _node?: HTMLMediaElement }>
	}
	let analysisContext: AudioContext | null = null
	let analysisSource: MediaStreamAudioSourceNode | null = null
	let analysisNode: AnalyserNode | null = null
	let analysisFrame = 0
	let isAnalyzing = false

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
	const refreshPosition = () => {
		tick.value++
	}
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
	let trackingTimer: number | null = null
	let mediaSessionSongId: string | null = null

	const stopBeatAnalysis = (reason = "stopped") => {
		if (isAnalyzing && DEBUG_BEAT_ANALYSIS)
			console.info(`[beat analyzer] stopped: ${reason}`)
		isAnalyzing = false
		if (analysisFrame) cancelAnimationFrame(analysisFrame)
		analysisFrame = 0
		analysisSource?.disconnect()
		analysisSource = null
		analysisNode = null
		beatEnergy.value = 0
	}

	const startBeatAnalysis = (howl: Howl) => {
		stopBeatAnalysis("restarted")
		const mediaElement = (howl as HowlWithMediaNode)._sounds?.[0]?._node
		if (!mediaElement) {
			if (DEBUG_BEAT_ANALYSIS)
				console.warn(
					"[beat analyzer] failed: Howler media element unavailable",
				)
			return
		}

		const elementWithCapture = mediaElement as HTMLMediaElement & {
			captureStream?: () => MediaStream
			mozCaptureStream?: () => MediaStream
			webkitCaptureStream?: () => MediaStream
		}
		const capture =
			elementWithCapture.captureStream ??
			elementWithCapture.mozCaptureStream ??
			elementWithCapture.webkitCaptureStream
		if (!capture) {
			if (DEBUG_BEAT_ANALYSIS)
				console.warn(
					"[beat analyzer] failed: media capture unsupported",
				)
			return
		}

		try {
			const stream = capture.call(mediaElement)
			if (stream.getAudioTracks().length === 0) {
				if (DEBUG_BEAT_ANALYSIS)
					console.warn(
						"[beat analyzer] failed: capture has no audio tracks",
					)
				return
			}
			analysisContext ??= new AudioContext()
			if (analysisContext.state === "suspended")
				void analysisContext.resume().catch(() => {})
			analysisNode = analysisContext.createAnalyser()
			analysisNode.fftSize = 2048
			analysisNode.smoothingTimeConstant = 0.05
			analysisSource = analysisContext.createMediaStreamSource(stream)
			analysisSource.connect(analysisNode)

			const samples = new Uint8Array(analysisNode.frequencyBinCount)
			let previousBass: number | null = null
			let riseAverage = 0.01
			let riseVariance = 0.0004
			let pulse = 0
			let lastBeatLogAt = 0
			let lastLevelLogAt = 0
			const sample = () => {
				if (!analysisNode) return
				analysisNode.getByteFrequencyData(samples)
				const sampleRate = analysisContext!.sampleRate
				const firstBin = Math.max(
					1,
					Math.floor((45 * 2048) / sampleRate),
				)
				const lastBin = Math.min(
					samples.length - 1,
					Math.ceil((130 * 2048) / sampleRate),
				)
				let bass = 0
				for (let bin = firstBin; bin <= lastBin; bin++)
					bass += samples[bin] ?? 0
				bass /= Math.max(1, lastBin - firstBin + 1) * 255
				if (previousBass === null) previousBass = bass
				const rise = Math.max(0, bass - previousBass)
				previousBass = previousBass * 0.985 + bass * 0.015
				const riseDeviation = Math.sqrt(riseVariance)
				const strongThumpThreshold = Math.min(
					0.1,
					Math.max(0.045, riseAverage + riseDeviation * 2),
				)
				const attack = Math.max(0, rise - strongThumpThreshold)
				const thumpCooldown = Math.min(
					500,
					Math.max(300, 300 + riseDeviation * 4000),
				)
				const now = performance.now()
				const isStrongThump =
					rise >= strongThumpThreshold &&
					now - lastBeatLogAt > thumpCooldown
				const riseDelta = rise - riseAverage
				riseAverage += riseDelta * 0.01
				riseVariance += (riseDelta * riseDelta - riseVariance) * 0.01
				if (isStrongThump) {
					const thumpStrength = Math.min(0.38, 0.1 + attack * 2.5)
					pulse = Math.max(pulse, thumpStrength)
					if (DEBUG_BEAT_ANALYSIS) {
						console.log(
							"[fullscreen beat]",
							`detected=${thumpStrength.toFixed(2)}`,
							`visual=${shapeBeatPulse(thumpStrength).toFixed(2)}`,
						)
					}
				} else pulse *= 0.94
				beatEnergy.value = Math.min(1, pulse)
				if (DEBUG_BEAT_ANALYSIS && now - lastLevelLogAt > 1000) {
					lastLevelLogAt = now
					console.info(
						"[beat level]",
						`bass=${bass.toFixed(3)}`,
						`attack=${attack.toFixed(3)}`,
						`gate=${strongThumpThreshold.toFixed(3)}`,
						`cooldown=${Math.round(thumpCooldown)}`,
						`pulse=${beatEnergy.value.toFixed(2)}`,
					)
				}
				if (isStrongThump) lastBeatLogAt = now
				analysisFrame = requestAnimationFrame(sample)
			}
			analysisFrame = requestAnimationFrame(sample)
			isAnalyzing = true
			if (DEBUG_BEAT_ANALYSIS)
				console.info("[beat analyzer] analysis started")
		} catch (error) {
			stopBeatAnalysis()
			if (DEBUG_BEAT_ANALYSIS)
				console.warn(
					"[beat analyzer] failed while setting up audio capture",
					error,
				)
		}
	}

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
						src: GET_FILE(
							currentSong.value.album.file,
							mediaBaseUrl,
						),
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
		if (trackingTimer !== null) window.clearTimeout(trackingTimer)
		const update = () => {
			tick.value++
			const now = Date.now()
			if (now - lastPositionUpdate >= 1000) {
				lastPositionUpdate = now
				updateMediaSession()
			}
			trackingTimer = window.setTimeout(update, 100)
		}

		update()
	}

	const stopTracking = () => {
		if (trackingTimer !== null) window.clearTimeout(trackingTimer)
		trackingTimer = null
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
				stopBeatAnalysis("track ended")
				void closeFullscreen()
				next()
				stopTracking()
			},
			onstop: () => {
				stopBeatAnalysis("playback stopped")
				isPlaying.value = false
				stopTracking()
				if (navigator.mediaSession)
					navigator.mediaSession.playbackState = "none"
			},
			onplay: () => {
				isPlaying.value = true
				startBeatAnalysis(newSound)
				startTracking()
				if (navigator.mediaSession)
					navigator.mediaSession.playbackState = "playing"
			},
			onpause: () => {
				stopBeatAnalysis("paused")
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
			)
				return

			const target = event.target
			if (
				target instanceof HTMLElement &&
				target.closest(
					"input, textarea, select, button, [contenteditable='true'], [role='slider']",
				)
			)
				return

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
				beatEnergy,
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
				refreshPosition,
				duration,
				volume,
				queue,
			},
		},
	}
})
