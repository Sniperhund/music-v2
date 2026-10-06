<script setup lang="tsx">
import { GET_FILE } from "@/utils/file"

const widthFixerRef = useTemplateRef("width-fixer-ref")
const playerRef = useTemplateRef("player-ref")

onMounted(() => {
	const resizePlayer = () => {
		if (playerRef.value && widthFixerRef.value)
			playerRef.value.style.width = `calc(${widthFixerRef.value.clientWidth}px)`
	}

	const resizeObserver = new ResizeObserver(() => {
		resizePlayer()
	})

	if (widthFixerRef.value) resizeObserver.observe(widthFixerRef.value)
	resizePlayer()
})

const song = useSong()
const {
	isPlaying,
	play,
	pause,
	next,
	prev,
	shuffle,
	repeat,
	repeatOnce,
	cycleRepeat,
	secondsPlayed,
	duration,
	volume,
} = usePlayer()

const secondsPlayedFormatted = computed(() =>
	new Date(secondsPlayed.value * 1000).toISOString().slice(14, 19),
)

const durationFormatted = computed(() =>
	new Date(duration.value * 1000).toISOString().slice(14, 19),
)

const { open: openFullscreen } = useFullscreen()
const queueOpen = ref(false)
</script>

<template>
	<div id="width-fixer" ref="width-fixer-ref"></div>
	<article class="player" ref="player-ref" :class="{ active: song }">
		<Icon name="lucide:repeat-1" class="icon-preload" aria-hidden="true" />
		<template v-if="song">
			<div class="track">
				<NuxtImg
					:src="GET_FILE(song.album.file)"
					:alt="song.name"
					:height="56"
					:width="56"
				/>

				<div class="details">
					<p>{{ song.name }}</p>
					<ArtistName :artists="song.artists" class="artists" />
				</div>
			</div>
			<div class="controls">
				<div class="btns">
					<Icon name="lucide:shuffle" @click="shuffle()" />
					<Icon name="lucide:skip-back" @click="prev()" />
					<Icon
						name="lucide:pause"
						v-if="isPlaying"
						@click="pause()"
					/>
					<Icon name="lucide:play" v-else @click="play()" />
					<Icon name="lucide:skip-forward" @click="next()" />
					<Icon
						:name="repeatOnce ? 'lucide:repeat-1' : 'lucide:repeat'"
						:class="{ repeating: repeat || repeatOnce }"
						@click="cycleRepeat()"
					/>
				</div>
				<div class="slider">
					<p>{{ secondsPlayedFormatted }}</p>
					<RangeSlider
						:model-value="secondsPlayed"
						@update:model-value="(v) => (secondsPlayed = v ?? 0)"
						:max="duration"
						dont-update-immediately
					/>
					<p>{{ durationFormatted }}</p>
				</div>
			</div>
			<div class="misc-btns">
				<div class="volume">
					<Icon name="lucide:volume-2" />
					<RangeSlider
						class="slider"
						:model-value="volume"
						@update:model-value="
							(v) => {
								if (v !== undefined) volume = v
							}
						"
						:max="1"
						:min="0"
						:step="0.01"
					/>
				</div>
				<Icon
					name="lucide:list"
					@click="queueOpen = true"
				/>
				<Icon name="lucide:expand" @click="openFullscreen()" />
			</div>
		</template>
	</article>
	<PlayerQueue v-model:open="queueOpen" />
	<PlayerFullscreen />
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;
@use "@/styles/util" as *;

.icon-preload {
	display: none;
}

#width-fixer {
	width: 100%;
}

.player {
	position: fixed;
	bottom: 1rem;

	height: $player-height;

	border-radius: $border-radius-lg;
	border: 1px solid $color-border;

	background-color: $color-background;

	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 1rem;

	padding: 0.5rem 2rem;

	transform: translateY(150%);
	transition: transform 0.2s ease-out;

	&.active {
		transform: translateY(0);
	}

	span {
		font-size: 24px;
		cursor: pointer;
		transition: color 0.2s ease;
	}
}

.track,
.controls,
.misc-btns,
.controls {
	display: flex;
	width: 100%;
	gap: 0.5rem;
	align-items: center;
}

.track {
	.details {
		display: flex;
		flex-direction: column;
		width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		line-height: 1.375;
	}

	img {
		height: 100%;
		border-radius: $border-radius-standard;
	}
}

.controls {
	flex-direction: column;
	justify-content: center;

	align-items: flex-start;

	.btns,
	.slider {
		display: flex;
		justify-content: center;
		width: 100%;
	}

	.btns {
		gap: 1rem;
	}

	.slider {
		gap: 12px;
		align-items: center;

		& p {
			@include fontSize(15px);
			opacity: 0.8;
		}
	}

	.repeating {
		color: $color-accent;
	}
}

.misc-btns {
	justify-content: end;

	.volume {
		min-width: 100px;
		max-width: 150px;

		display: flex;
		gap: 0.5rem;

		span {
			font-size: 18px;
		}

		.slider {
			flex: 1;
		}
	}
}
</style>
