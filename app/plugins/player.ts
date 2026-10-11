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
	const DEBUG_BEAT_ANALYSIS = true
	const DRUM_PULSE_MULTIPLIER = 0.7

	const sound = ref<Howl | null>(null)
	const queue = ref<Track[]>([])
	const prevQueue = ref<Track[]>([])
	const currentQueue = ref<Track[]>([])
	const currentSong = ref<Track | null>(null)
	const repeat = ref(false)
	const repeatOnce = ref(false)
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
			let previousKick: number | null = null
			let previousDrumBody: number | null = null
			let previousCymbals: number | null = null
			let bassRiseAverage = 0.01
			let bassRiseVariance = 0.0004
			let drumRiseAverage = 0.01
			let drumRiseVariance = 0.0004
			let pulse = 0
			let pulseTarget = 0
			let lastPulseUpdateAt: number | null = null
			let lastBassHitAt = 0
			let lastDrumHitAt = 0
			let bassCooldown = 80
			let drumCooldown = 240
			let lastPulseLogAt = 0
			let lastLevelLogAt = 0
			const sample = () => {
				if (!analysisNode) return
				analysisNode.getByteFrequencyData(samples)
				const sampleRate = analysisContext!.sampleRate
				const bandEnergy = (lowHz: number, highHz: number) => {
					const firstBin = Math.max(
						1,
						Math.floor((lowHz * 2048) / sampleRate),
					)
					const lastBin = Math.min(
						samples.length - 1,
						Math.ceil((highHz * 2048) / sampleRate),
					)
					let energy = 0
					for (let bin = firstBin; bin <= lastBin; bin++)
						energy += samples[bin] ?? 0
					return energy / Math.max(1, lastBin - firstBin + 1) / 255
				}
				const bass = bandEnergy(45, 130)
				const kick = bandEnergy(55, 250)
				const drumBody = bandEnergy(130, 1200)
				const cymbals = bandEnergy(2500, 8000)
				if (previousBass === null) previousBass = bass
				if (previousKick === null) previousKick = kick
				if (previousDrumBody === null) previousDrumBody = drumBody
				if (previousCymbals === null) previousCymbals = cymbals
				const bassRise = Math.max(0, bass - previousBass)
				const drumRise = Math.max(
					0,
					Math.max(
						kick - previousKick,
						drumBody - previousDrumBody,
						cymbals - previousCymbals,
					),
				)
				previousBass = previousBass * 0.985 + bass * 0.015
				previousKick = previousKick * 0.85 + kick * 0.15
				previousDrumBody = previousDrumBody * 0.9 + drumBody * 0.1
				previousCymbals = previousCymbals * 0.9 + cymbals * 0.1
				const bassRiseDeviation = Math.sqrt(bassRiseVariance)
				const drumRiseDeviation = Math.sqrt(drumRiseVariance)
				const bassThreshold = Math.min(
					0.16,
					Math.max(0.065, bassRiseAverage + bassRiseDeviation * 3),
				)
				const drumThreshold = Math.min(
					0.07,
					Math.max(0.009, drumRiseAverage + drumRiseDeviation * 1.25),
				)
				const bassAttack = Math.max(0, bassRise - bassThreshold)
				const drumAttack = Math.max(0, drumRise - drumThreshold)
				const now = performance.now()
				const isBassHit =
					bassRise >= bassThreshold &&
					now - lastBassHitAt > bassCooldown
				const isDrumHit =
					drumRise >= drumThreshold &&
					now - lastDrumHitAt > drumCooldown &&
					now - lastBassHitAt > bassCooldown
				const bassDelta = bassRise - bassRiseAverage
				bassRiseAverage += bassDelta * 0.01
				bassRiseVariance +=
					(bassDelta * bassDelta - bassRiseVariance) * 0.01
				const drumDelta = drumRise - drumRiseAverage
				drumRiseAverage += drumDelta * 0.01
				drumRiseVariance +=
					(drumDelta * drumDelta - drumRiseVariance) * 0.01
				if (isBassHit || isDrumHit) {
					const bassStrength = isBassHit
						? Math.min(0.38, (0.1 + bassAttack * 2.5) * 1.1)
						: 0
					const drumStrength = isDrumHit
						? Math.min(0.4, 0.13 + drumAttack * 4) *
							DRUM_PULSE_MULTIPLIER
						: 0
					const hitStrength = Math.min(
						0.4,
						bassStrength + drumStrength * 0.65,
					)
					pulseTarget = Math.max(pulseTarget, hitStrength)
					if (isBassHit) {
						const bassCooldownScale = Math.min(1, bassStrength / 0.38)
						const combinedCooldownScale = Math.min(
							1,
							Math.max(bassStrength, drumStrength) / 0.38,
						)
						bassCooldown = 80 + bassCooldownScale * 160
						drumCooldown = 240 + combinedCooldownScale * 160
					} else if (isDrumHit) {
						const drumCooldownScale = Math.min(1, drumStrength / 0.28)
						drumCooldown = 240 + drumCooldownScale * 160
					}
					if (
						DEBUG_BEAT_ANALYSIS &&
						now - lastPulseLogAt > 1000
					) {
						lastPulseLogAt = now
						console.log(
							"[fullscreen pulse]",
							`bass=${bassStrength.toFixed(2)}`,
							`drums=${drumStrength.toFixed(2)}`,
							`visual=${shapeBeatPulse(hitStrength).toFixed(2)}`,
						)
					}
				}
				const pulseDelta =
					lastPulseUpdateAt === null
						? 1000 / 60
						: Math.min(100, now - lastPulseUpdateAt)
				lastPulseUpdateAt = now
				pulseTarget *= Math.exp(-pulseDelta / 260)
				const pulseSmoothing =
					1 - Math.exp(-pulseDelta / (pulseTarget > pulse ? 90 : 150))
				pulse += (pulseTarget - pulse) * pulseSmoothing
				beatEnergy.value = Math.min(1, pulse)
				if (DEBUG_BEAT_ANALYSIS && now - lastLevelLogAt > 5000) {
					lastLevelLogAt = now
					console.info(
						"[pulse levels]",
						`bass=${bass.toFixed(3)}`,
						`drums=${Math.max(kick, drumBody, cymbals).toFixed(3)}`,
						`bassRise=${bassRise.toFixed(3)}`,
						`drumRise=${drumRise.toFixed(3)}`,
						`pulse=${beatEnergy.value.toFixed(2)}`,
					)
				}
				if (isBassHit) {
					lastBassHitAt = now
					lastDrumHitAt = now
				} else if (isDrumHit) lastDrumHitAt = now
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
				if (
					queue.value.length === 0 &&
					!repeat.value &&
					!repeatOnce.value
				)
					void closeFullscreen()
				if (repeatOnce.value && sound.value === newSound) {
					repeatOnce.value = false
					newSound.seek(0)
					newSound.play()
				} else {
					void next()
				}
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

	const cycleRepeat = () => {
		if (repeatOnce.value) {
			repeatOnce.value = false
			repeat.value = true
		} else if (repeat.value) {
			repeat.value = false
		} else {
			repeatOnce.value = true
		}
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
				repeatOnce,
				cycleRepeat,
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
