<script setup lang="tsx">
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
const { isPlaying, play, pause, next, prev } = usePlayer()
</script>

<template>
	<div id="width-fixer" ref="width-fixer-ref"></div>
	<article class="player" ref="player-ref" :class="{ active: song }">
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
				<Icon name="lucide:shuffle" />
				<Icon name="lucide:skip-back" @click="prev()" />
				<Icon name="lucide:pause" v-if="isPlaying" @click="pause()" />
				<Icon name="lucide:play" v-else @click="play()" />
				<Icon name="lucide:skip-forward" @click="next()" />
				<Icon name="lucide:repeat" />
			</div>
			<div class="misc-btns"></div>
		</template>
	</article>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;

#width-fixer {
	width: 100%;
}

.player {
	position: fixed;
	bottom: 1rem;

	height: 72px;

	border-radius: $border-radius-lg;
	border: 1px solid $color-border;

	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 1rem;

	padding: 0.5rem 2rem;

	transform: translateY(150%);
	transition: transform 0.2s ease-out;

	&.active {
		transform: translateY(0);
	}
}

.track,
.controls,
.misc-btns {
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
	justify-content: center;
	gap: 1rem;

	span {
		font-size: 24px;
		cursor: pointer;
	}
}
</style>
