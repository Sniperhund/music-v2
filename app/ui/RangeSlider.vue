<script setup lang="ts">
interface SliderProps {
	min?: number
	max?: number
	step?: number
}

const props = withDefaults(defineProps<SliderProps>(), {
	min: 0,
	max: 100,
	step: 1,
})

const value = defineModel<number>()

const sliderRef = useTemplateRef("slider-ref")
const percentage = computed(() => {
	const range = props.max - props.min
	return (((value.value ?? 0) - props.min) / range) * 100
})

const updateFromEvent = (event: MouseEvent) => {
	if (!sliderRef.value) return

	const rect = sliderRef.value.getBoundingClientRect()
	const x = event.clientX - rect.left
	const ratio = Math.min(Math.max(x / rect.width, 0), 1)

	value.value = props.min + ratio * (props.max - props.min)
}

const onMouseDown = (event: MouseEvent) => {
	updateFromEvent(event)

	const move = (e: MouseEvent) => updateFromEvent(e)
	const up = () => {
		window.removeEventListener("mousemove", move)
		window.removeEventListener("mouseup", up)
	}

	window.addEventListener("mousemove", move)
	window.addEventListener("mouseup", up)
}
</script>

<template>
	<div ref="slider-ref" class="slider" @mousedown="onMouseDown">
		<div class="track">
			<div class="fill" :style="{ width: percentage + '%' }" />
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;

.slider {
	display: flex;
	align-items: center;
	cursor: pointer;
	user-select: none;
}

.slider .track {
	position: relative;
	width: 100%;
	height: 6px;
	border-radius: 999px;
	background: $color-border;
	overflow: hidden;
}

.slider .fill {
	position: absolute;
	inset: 0 auto 0 0;
	height: 100%;
	background: $color-accent;
	border-radius: 999px;
	transition: width 0.08s linear;
}
</style>
