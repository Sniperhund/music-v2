<script setup lang="ts">
export interface DropdownMenuItem {
	label: string
	icon: string
	onSelect?: () => void
}

interface DropdownMenuProps {
	items: DropdownMenuItem[]
}

const props = defineProps<DropdownMenuProps>()

const open = ref(false)
const placement = ref<"bottom" | "top">("bottom")
const root = useTemplateRef("root")

const toggle = async () => {
	open.value = !open.value

	if (open.value) {
		await nextTick()
		updatePlacement()
	}
}
const close = () => (open.value = false)

const updatePlacement = () => {
	const el = root.value
	if (!el) return

	const rect = el.getBoundingClientRect()

	const spaceBelow = window.innerHeight - rect.bottom
	const spaceAbove = rect.top

	// TODO: Calculate height instead
	const menuHeight = 220

	console.log(
		spaceBelow,
		menuHeight,
		spaceAbove,
		spaceBelow < menuHeight && spaceAbove > spaceBelow,
		spaceBelow < menuHeight && spaceAbove > spaceBelow ? "top" : "bottom",
	)

	placement.value =
		spaceBelow < menuHeight && spaceAbove > spaceBelow ? "top" : "bottom"
}

const handleOutsideClick = (e: MouseEvent) => {
	if (!root.value) return
	if (!root.value.contains(e.target as Node)) close()
}

const handleKey = (e: KeyboardEvent) => {
	if (e.key == "Escape") close()
}

const handleReposition = () => {
	if (open.value) updatePlacement()
}

onMounted(() => {
	document.addEventListener("click", handleOutsideClick)
	document.addEventListener("keydown", handleKey)
	window.addEventListener("resize", handleReposition)
	window.addEventListener("scroll", handleReposition, true)
})

onBeforeMount(() => {
	document.removeEventListener("click", handleOutsideClick)
	document.removeEventListener("keydown", handleKey)
	window.removeEventListener("resize", handleReposition)
	window.removeEventListener("scroll", handleReposition, true)
})
</script>

<template>
	<div ref="root" class="dropdown">
		<div @click="toggle" class="trigger">
			<slot />
		</div>

		<Transition name="dropdown">
			<div v-show="open" class="menu" :class="placement">
				<button
					v-for="(item, i) in items"
					:key="i"
					class="item"
					@click="
						() => {
							item.onSelect?.()
							close()
						}
					"
				>
					<Icon :name="item.icon" class="icon" />
					<span>{{ item.label }}</span>
				</button>
			</div>
		</Transition>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;

.dropdown {
	position: relative;
	display: inline-block;

	.menu {
		position: absolute;

		right: 0;

		min-width: 180px;
		padding: 0.5rem;

		background-color: $color-secondary-background;
		border-radius: $border-radius-standard;
		box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);

		display: flex;
		flex-direction: column;
		gap: 2px;

		z-index: 1000;

		&.bottom {
			top: calc(100% + 0.5rem);
			transform-origin: top right;
		}

		&.top {
			bottom: calc(100% + 0.5rem);
			transform-origin: bottom right;
		}
	}

	.item {
		display: flex;
		align-items: center;
		gap: 8px;

		padding: 0.5rem;
		border-radius: $border-radius-standard;

		background: transparent;
		border: none;
		cursor: pointer;

		transition: background-color 0.2s ease;
	}

	.item:hover {
		background-color: $color-button-hover;
	}

	.icon {
		font-size: 16px;
	}
}

.dropdown-enter-active,
.dropdown-leave-active {
	transition:
		opacity 0.14s ease-out,
		transform 0.14s ease-out;
}

/* Starting state */
.dropdown-enter-from {
	opacity: 0;
	transform: translateY(-6px) scale(0.96);
}

/* End state */
.dropdown-enter-to {
	opacity: 1;
	transform: translateY(0) scale(1);
}

/* Leaving */
.dropdown-leave-from {
	opacity: 1;
	transform: translateY(0) scale(1);
}

.dropdown-leave-to {
	opacity: 0;
	transform: translateY(-4px) scale(0.98);
}
</style>
