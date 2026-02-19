<script setup lang="ts">
interface SliderProps {
	min?: number
	max?: number
	step?: number
	dontUpdateImmediately?: boolean
}

const props = withDefaults(defineProps<SliderProps>(), {
	min: 0,
	max: 100,
	step: 1,
	dontUpdateImmediately: false,
})

const value = defineModel<number>()

const sliderRef = useTemplateRef("slider-ref")

const isDragging = ref(false)
const localValue = ref<number | null>(null)

const percentage = computed(() => {
	const currentValue =
		isDragging.value && props.dontUpdateImmediately
			? (localValue.value ?? value.value ?? 0)
			: (value.value ?? 0)
	const range = props.max - props.min
	return (((currentValue ?? 0) - props.min) / range) * 100
})

const updateFromEvent = (event: MouseEvent) => {
	if (!sliderRef.value) return

	const rect = sliderRef.value.getBoundingClientRect()
	const x = event.clientX - rect.left
	const ratio = Math.min(Math.max(x / rect.width, 0), 1)

	const newValue = props.min + ratio * (props.max - props.min)

	if (props.dontUpdateImmediately) localValue.value = newValue
	else value.value = newValue
}

const onMouseDown = (event: MouseEvent) => {
	isDragging.value = true
	updateFromEvent(event)

	const move = (e: MouseEvent) => updateFromEvent(e)
	const up = () => {
		window.removeEventListener("mousemove", move)
		window.removeEventListener("mouseup", up)

		isDragging.value = false

		if (localValue.value != null && props.dontUpdateImmediately)
			value.value = localValue.value

		localValue.value = null
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
}
</style>
