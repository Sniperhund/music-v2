<script setup lang="ts">
import { GET_FILE } from "@/utils/file"

const { showButtons } = defineProps<{ showButtons: boolean }>()

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
	new Date((duration.value - secondsPlayed.value) * 1000)
		.toISOString()
		.slice(14, 19),
)
</script>

<template>
	<article class="track-display" v-if="song">
		<NuxtImg
			class="cover"
			:src="GET_FILE(song.album.file)"
			:alt="song.name"
			width="512"
			height="512"
		/>

		<div class="track">
			<p class="name">{{ song.name }}</p>
			<ArtistName :artists="song.artists" />
		</div>

		<div class="slider">
			<RangeSlider
				:model-value="secondsPlayed"
				@update:model-value="(v) => (secondsPlayed = v ?? 0)"
				:max="duration"
				dont-update-immediately
				monochrome
			/>
			<div class="time">
				<p>{{ secondsPlayedFormatted }}</p>
				<p>{{ durationFormatted }}</p>
			</div>
		</div>

		<div class="btns" :class="{ hidden: !showButtons }">
			<Icon name="lucide:shuffle" @click="shuffle()" />
			<Icon name="lucide:skip-back" @click="prev()" />
			<Icon name="lucide:pause" v-if="isPlaying" @click="pause()" />
			<Icon name="lucide:play" v-else @click="play()" />
			<Icon name="lucide:skip-forward" @click="next()" />
			<Icon
				:name="repeatOnce ? 'lucide:repeat-1' : 'lucide:repeat'"
				:class="{ repeating: repeat || repeatOnce }"
				@click="cycleRepeat()"
			/>
		</div>

		<div class="volume-slider" :class="{ hidden: !showButtons }">
			<Icon name="lucide:volume-2" />
			<RangeSlider
				:model-value="volume"
				@update:model-value="
					(v) => {
						if (v !== undefined) volume = v
					}
				"
				:max="1"
				:min="0"
				:step="0.01"
				monochrome
			/>
		</div>
	</article>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;
@use "@/styles/variables" as *;

.track-display {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1rem;

	max-width: 500px;
}

.cover {
	width: 100%;
	aspect-ratio: 1;
	object-fit: cover;
	border-radius: $border-radius-standard;
}

.track {
	@include fontSize(16px);
	width: 100%;

	line-height: 1.3;

	.name {
		@include fontSize(17px);
		font-weight: bold;
	}
}

.slider {
	display: flex;
	flex-direction: column;
	width: 100%;
	gap: 4px;

	.time {
		width: 100%;
		display: flex;
		justify-content: space-between;
		opacity: 0.5;

		& p {
			@include fontSize(15px);
		}
	}
}

.btns {
	cursor: pointer;
	font-size: 30px;
	display: flex;
	justify-content: center;
	width: 100%;
	gap: 1rem;

	transition: opacity 0.2s ease-in-out;

	&.hidden {
		opacity: 0;
		pointer-events: none;
	}

	& > * {
		transition: color 0.2s ease;
	}

	.repeating {
		color: $color-accent;
	}
}

.volume-slider {
	align-self: stretch;
	margin: 0.5rem 1rem 0;
	display: flex;
	align-items: center;
	gap: 0.75rem;
	opacity: 1;
	transition: opacity 0.2s ease-in-out;

	:deep(.slider) {
		flex: 1;
	}

	&.hidden {
		opacity: 0;
		pointer-events: none;
	}
}
</style>
