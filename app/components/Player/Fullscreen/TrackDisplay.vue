<script setup lang="ts">
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
	secondsPlayed,
	duration,
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
				name="lucide:repeat"
				:class="{ repeating: repeat }"
				@click="repeat = !repeat"
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

	overflow: hidden;
	max-height: 30px;
	transition: max-height 0.2s ease-in-out;

	&.hidden {
		max-height: 0;
	}

	& > * {
		transition: color 0.2s ease;
	}

	.repeating {
		color: $color-accent;
	}
}
</style>
