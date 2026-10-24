import { Howl, Howler } from "howler"
import { shapeBeatPulse } from "~/utils/beat"

export default defineNuxtPlugin((nuxtApp) => {
	const mediaBaseUrl = useRuntimeConfig().public.mediaBaseUrl
	const { fullscreen, close: closeFullscreen } = useFullscreen()
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
	const HANDOFF_SYNC_INTERVAL_MS = 15_000
	const HANDOFF_ENABLED = !import.meta.dev
	const DEFAULT_VOLUME = 0.5
	const DEBUG_BEAT_ANALYSIS = false
	const BASS_DRUM_PULSE_MULTIPLIER = 0.9
	const DRUM_PULSE_MULTIPLIER = 0.7
	const BEAT_ANALYSIS_FRAME_INTERVAL = 1000 / 30

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
	let recentlyPlayedSound: Howl | null = null
	let listeningSound: Howl | null = null
	let listeningTrack: Track | null = null
	let listeningSessionId: string | null = null
	let listeningStartedAt: Date | null = null
	let listeningLastPosition = 0
	let listeningSeconds = 0
	let listeningEventSaved = false
	let listeningEventInFlight = false
	let listeningFlushPending = false
	let listeningLastSubmittedSeconds = 0
	let listeningLastAttemptAt = 0
	let mediaSessionSongId: string | null = null
	let handoffSyncTimer: number | null = null
	let handoffSaveInFlight = false
	let handoffSavePending = false
	let handoffLastSavedAt = 0
	let handoffRestorePending = false
	let handoffRestoreAttempted = false

	const consumePlaybackHandoff = async () => {
		if (!HANDOFF_ENABLED) return
		try {
			await $fetch("/api/user/playback-handoff", { method: "DELETE" })
			handoffRestorePending = false
		} catch {
			// Keep the restored state marked as pending if the consume request fails.
		}
	}

	const savePlaybackHandoff = async () => {
		if (!HANDOFF_ENABLED || !import.meta.client || handoffRestorePending || !currentSong.value || !useAuth().authenticated.value) return
		if (handoffSaveInFlight) {
			handoffSavePending = true
			return
		}
		handoffSaveInFlight = true
		try {
			await $fetch("/api/user/playback-handoff", {
				method: "PUT",
				body: {
					currentTrackId: currentSong.value._id,
					position: secondsPlayed.value,
					queueTrackIds: currentQueue.value.map((track) => track._id),
					remainingTrackIds: queue.value.map((track) => track._id),
					historyTrackIds: prevQueue.value.map((track) => track._id),
					repeat: repeat.value,
					repeatOnce: repeatOnce.value,
					wasPlaying: isPlaying.value,
				},
			})
			handoffLastSavedAt = Date.now()
		} catch {
			// Playback continues if the handoff endpoint is temporarily unavailable.
		} finally {
			handoffSaveInFlight = false
			if (handoffSavePending) {
				handoffSavePending = false
				void savePlaybackHandoff()
			}
		}
	}

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
			let previousBassDrum: number | null = null
			let previousDrumBody: number | null = null
			let previousCymbals: number | null = null
			let bassRiseAverage = 0.01
			let bassRiseVariance = 0.0004
			let bassDrumRiseAverage = 0.002
			let bassDrumRiseVariance = 0.0001
			let drumRiseAverage = 0.01
			let drumRiseVariance = 0.0004
			let pulse = 0
			let pulseTarget = 0
			let lastPulseUpdateAt: number | null = null
			let lastAnalysisAt: number | null = null
			let lastBassHitAt = 0
			let lastDrumHitAt = 0
			let lastBassDrumHitAt = 0
			let bassCooldown = 80
			let drumCooldown = 240
			let bassDrumCooldown = 240
			let lastPulseLogAt = 0
			let lastLevelLogAt = 0
			const sample = (frameTime: number) => {
				if (!analysisNode) return
				if (
					lastAnalysisAt !== null &&
					frameTime - lastAnalysisAt < BEAT_ANALYSIS_FRAME_INTERVAL
				) {
					analysisFrame = requestAnimationFrame(sample)
					return
				}
				lastAnalysisAt = frameTime
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
				const bassDrum = bandEnergy(35, 250)
				const drumBody = bandEnergy(130, 1200)
				const cymbals = bandEnergy(2500, 8000)
				if (previousBass === null) previousBass = bass
				if (previousBassDrum === null) previousBassDrum = bassDrum
				if (previousDrumBody === null) previousDrumBody = drumBody
				if (previousCymbals === null) previousCymbals = cymbals
				const bassRise = Math.max(0, bass - previousBass)
				const bassDrumRise = Math.max(0, bassDrum - previousBassDrum)
				const bodyRise = Math.max(0, drumBody - previousDrumBody)
				const cymbalRise = Math.max(0, cymbals - previousCymbals)
				const drumRise = Math.max(0, Math.max(bodyRise, cymbalRise))
				previousBass = previousBass * 0.985 + bass * 0.015
				previousBassDrum = previousBassDrum * 0.85 + bassDrum * 0.15
				previousDrumBody = previousDrumBody * 0.9 + drumBody * 0.1
				previousCymbals = previousCymbals * 0.9 + cymbals * 0.1
				const bassRiseDeviation = Math.sqrt(bassRiseVariance)
				const bassDrumRiseDeviation = Math.sqrt(bassDrumRiseVariance)
				const drumRiseDeviation = Math.sqrt(drumRiseVariance)
				const bassThreshold = Math.min(
					0.16,
					Math.max(0.065, bassRiseAverage + bassRiseDeviation * 3),
				)
				const drumThreshold = Math.min(
					0.07,
					Math.max(0.009, drumRiseAverage + drumRiseDeviation * 1.25),
				)
				const bassDrumThreshold = Math.min(
					0.04,
					Math.max(
						0.003,
						bassDrumRiseAverage + bassDrumRiseDeviation * 0.8,
					),
				)
				const bassAttack = Math.max(0, bassRise - bassThreshold)
				const bassDrumAttack = Math.max(
					0,
					bassDrumRise - bassDrumThreshold,
				)
				const drumAttack = Math.max(0, drumRise - drumThreshold)
				const now = performance.now()
				const isBassHit =
					bassRise >= bassThreshold &&
					now - lastBassHitAt > bassCooldown
				const isBassDrumHit =
					bassDrumRise >= bassDrumThreshold &&
					now - lastBassDrumHitAt > bassDrumCooldown &&
					now - lastBassHitAt > bassCooldown
				const isOtherDrumHit =
					Math.max(bodyRise, cymbalRise) >= drumThreshold &&
					now - lastDrumHitAt > drumCooldown &&
					now - lastBassHitAt > bassCooldown
				const isDrumHit = isBassDrumHit || isOtherDrumHit
				const bassDelta = bassRise - bassRiseAverage
				bassRiseAverage += bassDelta * 0.01
				bassRiseVariance +=
					(bassDelta * bassDelta - bassRiseVariance) * 0.01
				const bassDrumDelta = bassDrumRise - bassDrumRiseAverage
				bassDrumRiseAverage += bassDrumDelta * 0.01
				bassDrumRiseVariance +=
					(bassDrumDelta * bassDrumDelta - bassDrumRiseVariance) *
					0.01
				const drumDelta = drumRise - drumRiseAverage
				drumRiseAverage += drumDelta * 0.01
				drumRiseVariance +=
					(drumDelta * drumDelta - drumRiseVariance) * 0.01
				if (isBassHit || isDrumHit) {
					const bassStrength = isBassHit
						? Math.min(0.38, (0.1 + bassAttack * 2.5) * 1.1)
						: 0
					const bassDrumStrength = isBassDrumHit
						? Math.min(0.4, 0.16 + bassDrumAttack * 5) *
							BASS_DRUM_PULSE_MULTIPLIER
						: 0
					const otherDrumStrength = isOtherDrumHit
						? Math.min(0.4, 0.13 + drumAttack * 4) *
							DRUM_PULSE_MULTIPLIER
						: 0
					const drumStrength = Math.max(
						bassDrumStrength,
						otherDrumStrength,
					)
					const hitStrength = Math.min(
						0.4,
						bassStrength + drumStrength * 0.65,
					)
					pulseTarget = Math.max(pulseTarget, hitStrength)
					if (isBassHit) {
						const bassCooldownScale = Math.min(
							1,
							bassStrength / 0.38,
						)
						const combinedCooldownScale = Math.min(
							1,
							Math.max(bassStrength, drumStrength) / 0.38,
						)
						bassCooldown = 80 + bassCooldownScale * 160
						drumCooldown = 240 + combinedCooldownScale * 160
						bassDrumCooldown = 240 + bassCooldownScale * 160
					} else {
						if (isBassDrumHit) {
							const bassDrumCooldownScale = Math.min(
								1,
								bassDrumStrength / 0.36,
							)
							bassDrumCooldown = 240 + bassDrumCooldownScale * 160
							lastBassDrumHitAt = now
						}
						if (isDrumHit) {
							const drumCooldownScale = Math.min(
								1,
								Math.max(bassDrumStrength, otherDrumStrength) /
									0.36,
							)
							drumCooldown = 240 + drumCooldownScale * 160
							lastDrumHitAt = now
						}
					}
					if (DEBUG_BEAT_ANALYSIS && now - lastPulseLogAt > 1000) {
						lastPulseLogAt = now
						console.log(
							"[fullscreen pulse]",
							`bass=${bassStrength.toFixed(2)}`,
							`bass_drums=${bassDrumStrength.toFixed(2)}`,
							`drums=${otherDrumStrength.toFixed(2)}`,
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
				const nextBeatEnergy =
					Math.round(Math.min(1, pulse) * 100) / 100
				if (nextBeatEnergy !== beatEnergy.value)
					beatEnergy.value = nextBeatEnergy
				if (DEBUG_BEAT_ANALYSIS && now - lastLevelLogAt > 5000) {
					lastLevelLogAt = now
					console.info(
						"[pulse levels]",
						`bass=${bass.toFixed(3)}`,
						`bass_drums=${bassDrum.toFixed(3)}`,
						`drums=${Math.max(drumBody, cymbals).toFixed(3)}`,
						`bassRise=${bassRise.toFixed(3)}`,
						`bassDrumRise=${bassDrumRise.toFixed(3)}`,
						`drumRise=${drumRise.toFixed(3)}`,
						`pulse=${beatEnergy.value.toFixed(2)}`,
					)
				}
				if (isBassHit) {
					lastBassHitAt = now
					lastDrumHitAt = now
					lastBassDrumHitAt = now
				}
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

	const syncBeatAnalysis = () => {
		if (fullscreen.value && isPlaying.value && sound.value)
			startBeatAnalysis(sound.value)
		else stopBeatAnalysis("fullscreen inactive or playback stopped")
	}
	watch([fullscreen, isPlaying, sound], syncBeatAnalysis)

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

	const saveRecentlyPlayedAlbum = () => {
		const currentSound = sound.value
		const currentTrack = currentSong.value
		if (
			!currentSound ||
			!currentTrack ||
			!useAuth().authenticated.value ||
			recentlyPlayedSound === currentSound
		) return

		const trackDuration = currentSound.duration()
		const position = currentSound.seek() as number
		if (!trackDuration || position / trackDuration <= 0.3) return

		recentlyPlayedSound = currentSound
		void $fetch("/api/user/recently-played", {
			method: "POST",
			body: { albumId: currentTrack.album._id },
		}).catch(() => {
			if (recentlyPlayedSound === currentSound) recentlyPlayedSound = null
		})
	}

	const trackListeningProgress = (completed = false, flush = false, allowStopped = false) => {
		const currentSound = sound.value
		const currentTrack = listeningSound === currentSound ? listeningTrack : currentSong.value
		if (!currentSound || !currentTrack || (!allowStopped && !currentSound.playing())) return

		if (listeningSound !== currentSound) {
			listeningSound = currentSound
			listeningTrack = currentTrack
			listeningSessionId = crypto.randomUUID()
			listeningStartedAt = new Date()
			listeningLastPosition = currentSound.seek() as number
			listeningSeconds = 0
			listeningEventSaved = false
			listeningEventInFlight = false
			listeningFlushPending = false
			listeningLastSubmittedSeconds = 0
			listeningLastAttemptAt = 0
			return
		}

		const position = currentSound.seek() as number
		const positionDelta = position - listeningLastPosition
		listeningLastPosition = position
		// Ignore seeks and position jumps; only count small forward playback steps.
		if (positionDelta > 0 && positionDelta <= 2) listeningSeconds += positionDelta

		const duration = currentSound.duration()
		const minimumListenedSeconds = Math.min(30, duration * 0.3) + 1
		if (
			!useAuth().authenticated.value ||
			!duration ||
			(!completed && listeningSeconds < minimumListenedSeconds) ||
			(completed && listeningSeconds <= 0)
		) return
		if (listeningEventSaved && !flush && !completed) return
		if (listeningEventSaved && listeningSeconds - listeningLastSubmittedSeconds < 0.5 && !completed) return
		if (listeningEventInFlight) {
			listeningFlushPending ||= flush || completed
			return
		}
		if (!flush && !completed && Date.now() - listeningLastAttemptAt < 5000) return

		listeningEventInFlight = true
		listeningLastAttemptAt = Date.now()
		const sessionId = listeningSessionId
		const submittedSeconds = Math.min(listeningSeconds, duration)
		void $fetch("/api/user/playback-events", {
			method: "POST",
			body: {
				sessionId,
				trackId: currentTrack._id,
				startedAt: listeningStartedAt?.toISOString(),
				listenedSeconds: submittedSeconds,
				completed,
			},
		}).then(() => {
			if (listeningSound === currentSound) {
				listeningEventSaved = true
				listeningLastSubmittedSeconds = submittedSeconds
			}
		}).catch(() => {
			// Listening continues if the analytics endpoint is temporarily unavailable.
		}).finally(() => {
			if (listeningSound === currentSound) {
				listeningEventInFlight = false
				if (listeningFlushPending) {
					listeningFlushPending = false
					trackListeningProgress(false, true, true)
				}
			}
		})
	}

	const startTracking = () => {
		if (trackingTimer !== null) window.clearTimeout(trackingTimer)
		const update = () => {
			tick.value++
			saveRecentlyPlayedAlbum()
			trackListeningProgress()
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

	if (import.meta.client && HANDOFF_ENABLED) {
		watch([currentSong, queue, currentQueue, prevQueue, repeat, repeatOnce, isPlaying], () => {
			if (!handoffRestorePending) void savePlaybackHandoff()
		}, { deep: true })
			handoffSyncTimer = window.setInterval(() => {
				if (isPlaying.value && Date.now() - handoffLastSavedAt >= HANDOFF_SYNC_INTERVAL_MS)
					void savePlaybackHandoff()
			}, HANDOFF_SYNC_INTERVAL_MS)
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
				trackListeningProgress(true, true, true)
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
				startTracking()
				if (navigator.mediaSession)
					navigator.mediaSession.playbackState = "playing"
				if (handoffRestorePending) void consumePlaybackHandoff()
			},
			onpause: () => {
				trackListeningProgress(false, true, true)
				stopBeatAnalysis("paused")
				isPlaying.value = false
				stopTracking()
				if (navigator.mediaSession)
					navigator.mediaSession.playbackState = "paused"
			},
			onseek: () => {
				if (listeningSound === newSound)
					listeningLastPosition = newSound.seek() as number
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

	const restorePlaybackHandoff = async () => {
		if (!HANDOFF_ENABLED || handoffRestoreAttempted || !useAuth().authenticated.value || currentSong.value) return
		handoffRestoreAttempted = true
		try {
			const handoff = await $fetch<{
				currentTrackId: string
				position: number
				queueTrackIds: string[]
				remainingTrackIds: string[]
				historyTrackIds: string[]
				repeat: boolean
				repeatOnce: boolean
				wasPlaying: boolean
			} | null>("/api/user/playback-handoff")
			if (!handoff || currentSong.value) return

			const allIds = [...new Set([
				handoff.currentTrackId,
				...handoff.queueTrackIds,
				...handoff.remainingTrackIds,
				...handoff.historyTrackIds,
			])]
			const tracks = await $fetch<Track[]>("/api/tracks", {
				params: { ids: allIds },
			})
			const tracksById = new Map(tracks.map((track) => [track._id, track]))
			const currentTrack = tracksById.get(handoff.currentTrackId)
			if (!currentTrack) return
			const restoreTracks = (ids: string[]) => ids.flatMap((id) => {
				const track = tracksById.get(id)
				return track ? [track] : []
			})

			handoffRestorePending = true
			currentSong.value = currentTrack
			currentQueue.value = restoreTracks(handoff.queueTrackIds)
			queue.value = restoreTracks(handoff.remainingTrackIds)
			prevQueue.value = restoreTracks(handoff.historyTrackIds)
			repeat.value = handoff.repeat
			repeatOnce.value = handoff.repeatOnce
			const restoredSound = await createHowl(currentTrack)
			if (!restoredSound) return
			if (restoredSound.state() !== "loaded") {
				await new Promise<void>((resolve, reject) => {
					restoredSound.once("load", () => resolve())
					restoredSound.once("loaderror", (_id, error) => reject(error))
				})
			}
			restoredSound.seek(Math.min(handoff.position, restoredSound.duration()))
			refreshPosition()
			updateMediaSession()

			if (handoff.wasPlaying) {
				restoredSound.play()
			} else {
				await consumePlaybackHandoff()
			}
		} catch {
			// Leave the server handoff available if restoring it fails.
			handoffRestorePending = false
		}
	}

	if (import.meta.client && HANDOFF_ENABLED) {
		watch(useAuth().authenticated, (authenticated) => {
			if (authenticated) void restorePlaybackHandoff()
		}, { immediate: true })
	}

	const pause = () => {
		sound.value?.pause()
		isPlaying.value = false
		updateMediaSession()
		void savePlaybackHandoff()
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
		trackListeningProgress(false, true, true)
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
		trackListeningProgress(false, true, true)

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
		trackListeningProgress(false, true, true)
		queue.value = []
		currentQueue.value = []
		currentSong.value = null
		sound.value?.stop()
		sound.value = null
		updateMediaSession()
		if (HANDOFF_ENABLED && import.meta.client && useAuth().authenticated.value)
			void $fetch("/api/user/playback-handoff", { method: "DELETE" }).catch(() => {})
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
		for (let i = queue.value.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1))
			const current = queue.value[i]
			queue.value[i] = queue.value[j]
			queue.value[j] = current
		}
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
