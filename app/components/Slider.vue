<script setup lang="ts">
interface SliderProps {
	title?: string
}

const props = defineProps<SliderProps>()

const slider = ref<HTMLDivElement>()

const scrollLeft = (num: number) => {
	if (slider.value) slider.value.scrollLeft += num
}

const left = () => {
	if (slider.value) scrollLeft(-slider.value.offsetWidth)
}

const right = () => {
	if (slider.value) scrollLeft(slider.value.offsetWidth)
}

const doesScroll = ref<boolean>(false)

const computeIfScroll = () => {
	if (!slider.value) return
	doesScroll.value = slider.value.scrollWidth > slider.value.clientWidth
}

onMounted(() => {
	computeIfScroll()

	window.addEventListener("reisze", computeIfScroll)

	onUnmounted(() => {
		window.removeEventListener("resize", computeIfScroll)
	})
})
</script>

<template>
	<div class="slider-container">
		<p>{{ props.title }}</p>

		<div>
			<Icon
				v-if="doesScroll"
				@click="left"
				class="left"
				name="material-symbols:chevron-left-rounded"
			/>
			<section class="slider" ref="slider"><slot /></section>
			<Icon
				v-if="doesScroll"
				@click="right"
				class="right"
				name="material-symbols:chevron-right-rounded"
			/>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;

.slider-container {
	& > p {
		margin-bottom: 0.5rem;
		@include fontSize(20px);
		font-weight: 600;
	}

	& > div {
		position: relative;
	}
}

.slider {
	display: flex;
	gap: 10px;
	overflow-x: auto;
	scrollbar-width: none;
	scroll-behavior: smooth;

	scroll-snap-type: x mandatory;

	& > * {
		flex: 0 0 auto;
		scroll-snap-align: center;
	}
}

.left,
.right {
	position: absolute;
	top: 50%;
	transform: translateY(-50%);
	z-index: 10;
	cursor: pointer;
	width: 48px;
	height: 48px;
}

.left {
	left: -48px;
}

.right {
	right: -48px;
}
</style>
