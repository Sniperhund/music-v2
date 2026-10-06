<script setup lang="ts">
export interface DropdownMenuItem {
	label: string
	icon: string
	onSelect?: () => void
}

interface DropdownMenuProps {
	items: DropdownMenuItem[][]
	label?: string
}

const props = defineProps<DropdownMenuProps>()

const open = ref(false)
const mounted = ref(false)
const placement = ref<"bottom" | "top">("bottom")
const root = useTemplateRef("root")
const triggerRef = useTemplateRef<HTMLButtonElement>("trigger-ref")
const menuRef = useTemplateRef<HTMLDivElement>("menu-ref")
const menuPosition = ref({ top: 0, left: 0 })

const menuItems = () =>
	Array.from(
		menuRef.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
	)

const focusMenuItem = (index: number) => {
	const items = menuItems()
	items[index]?.focus()
}

const close = (restoreFocus = false) => {
	open.value = false
	if (restoreFocus) nextTick(() => triggerRef.value?.focus())
}

const openMenu = async (last = false) => {
	open.value = true
	await nextTick()
	updatePlacement()
	const items = menuItems()
	focusMenuItem(last ? items.length - 1 : 0)
}

const toggle = async () => {
	if (open.value) close(true)
	else await openMenu()
}


const handleTriggerKeydown = (event: KeyboardEvent) => {
	if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
	event.preventDefault()
	event.stopPropagation()
	if (!open.value) void openMenu(event.key === "ArrowUp")
	else focusMenuItem(event.key === "ArrowUp" ? menuItems().length - 1 : 0)
}

const updatePlacement = () => {
	const el = root.value
	if (!el) return

	const rect = el.getBoundingClientRect()

	const spaceBelow = window.innerHeight - rect.bottom
	const spaceAbove = rect.top

	// TODO: Calculate height instead
	const menuHeight = 220

	const showAbove = spaceBelow < menuHeight && spaceAbove > spaceBelow
	placement.value = showAbove ? "top" : "bottom"
	menuPosition.value = {
		top: showAbove ? rect.top : rect.bottom,
		left: rect.right,
	}
}

const handleOutsideClick = (e: MouseEvent) => {
	const target = e.target as Node
	if (root.value?.contains(target) || menuRef.value?.contains(target)) return
	close()
}

const handleKey = (e: KeyboardEvent) => {
	if (!open.value) return
	const items = menuItems()
	const activeIndex = items.indexOf(document.activeElement as HTMLButtonElement)

	if (e.key === "Escape") {
		e.preventDefault()
		close(true)
	} else if (e.key === "ArrowDown") {
		e.preventDefault()
		focusMenuItem((activeIndex + 1 + items.length) % items.length)
	} else if (e.key === "ArrowUp") {
		e.preventDefault()
		focusMenuItem((activeIndex - 1 + items.length) % items.length)
	} else if (e.key === "Home") {
		e.preventDefault()
		focusMenuItem(0)
	} else if (e.key === "End") {
		e.preventDefault()
		focusMenuItem(items.length - 1)
	} else if (e.key === "Tab") {
		close()
	}
}

const handleReposition = () => {
	if (open.value) updatePlacement()
}

onMounted(() => {
	document.addEventListener("click", handleOutsideClick)
	document.addEventListener("keydown", handleKey)
	window.addEventListener("resize", handleReposition)
	window.addEventListener("scroll", handleReposition, true)
	mounted.value = true
})

onBeforeUnmount(() => {
	document.removeEventListener("click", handleOutsideClick)
	document.removeEventListener("keydown", handleKey)
	window.removeEventListener("resize", handleReposition)
	window.removeEventListener("scroll", handleReposition, true)
})
</script>

<template>
	<div ref="root" class="dropdown">
		<button
			ref="trigger-ref"
			type="button"
			class="trigger"
			:aria-label="props.label ?? 'Open options'"
			aria-haspopup="menu"
			:aria-expanded="open"
			@click="toggle"
			@keydown="handleTriggerKeydown"
		>
			<slot />
		</button>

		<Transition name="dropdown">
			<Teleport v-if="mounted" to="body">
				<div
					ref="menu-ref"
					v-show="open"
					class="dropdown-menu"
					role="menu"
					:class="placement"
					:style="{
						top: `${menuPosition.top}px`,
						left: `${menuPosition.left}px`,
					}"
				>
					<div
						v-for="(group, i) in items"
						:key="`group-${i}`"
						class="group"
						role="group"
					>
						<button
							v-for="(item, i) in group"
							:key="`item-${i}`"
							class="item"
							role="menuitem"
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
				</div>
			</Teleport>
		</Transition>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;

.dropdown {
	position: relative;
	display: inline-block;
}

.trigger {
	display: inline-flex;
	align-items: center;
	border: 0;
	padding: 0;
	color: inherit;
	background: transparent;
	cursor: pointer;
}

@media (max-width: 767px) {
	.trigger {
		padding: 0.75rem;
	}
}

.dropdown-menu {
	position: fixed;
	z-index: 1000;

	padding: 0.5rem;
	min-width: 180px;

	background-color: $color-secondary-background;
	border-radius: $border-radius-standard;
	box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);

	display: flex;
	flex-direction: column;

	transform: translateX(-100%);

	&.bottom {
		transform: translate(-100%, 0.5rem);
		transform-origin: top right;
	}

	&.top {
		transform: translate(-100%, calc(-100% - 0.5rem));
		transform-origin: bottom right;
	}

	.group {
		width: 100%;

		display: flex;
		flex-direction: column;
		gap: 4px;

		padding: 0.4rem 0;
		border-bottom: 1px solid $color-border;

		&:first-child {
			padding-top: 0;
		}

		&:last-child {
			border-bottom: none;
			padding-bottom: 0;
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

		span {
			white-space: nowrap;
		}
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
