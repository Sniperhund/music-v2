<script setup lang="ts">
import type { DropdownMenuItem } from "~/ui/DropdownMenu.vue"

const { data: user } = useApiFetch<{ name?: string; role?: string }>("/user")
const { signout } = useAuth()
const { lyricsConfirmationEnabled } = usePlayer()

const initials = computed(() => {
	const parts = (user.value?.name ?? "").trim().split(/\s+/).filter(Boolean)
	if (!parts.length) return "?"
	const first = parts[0] ?? ""
	if (parts.length === 1) return first.slice(0, 2).toUpperCase()
	const last = parts[parts.length - 1] ?? first
	return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase()
})

const logout = async () => {
	await signout()
	await navigateTo("/auth/signin")
}

const userMenuItems = computed<DropdownMenuItem[][]>(() => {
	const groups: DropdownMenuItem[][] = [[{
		label: "Log out",
		icon: "lucide:log-out",
		onSelect: logout,
	}]]
	if (user.value?.role === "admin") {
		groups.push([{
			label: `Lyrics confirmation: ${lyricsConfirmationEnabled.value ? "On" : "Off"}`,
			icon: lyricsConfirmationEnabled.value ? "lucide:toggle-right" : "lucide:toggle-left",
			keepOpen: true,
			onSelect: () => (lyricsConfirmationEnabled.value = !lyricsConfirmationEnabled.value),
		}])
	}
	return groups
})
</script>

<template>
	<div class="sidebar-container">
		<aside>
			<div class="sidebar-content">
				<slot name="sidebar" />
			</div>
			<DropdownMenu v-if="user" class="user-menu" :items="userMenuItems">
				<button class="user-avatar" type="button" :aria-label="`Open menu for ${user.name}`">
					<span class="avatar-initials">{{ initials }}</span>
					<span class="avatar-name">{{ user.name }}</span>
				</button>
			</DropdownMenu>
		</aside>

		<main>
			<slot />
		</main>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/variables" as *;
@use "sass:color";

.sidebar-container {
	width: 100vw;
	height: 100vh;

	overflow: hidden;

	display: flex;

	background-color: $color-background;
	color: $color-text;

	& aside {
		height: 100%;
		min-width: 275px;
		max-width: 300px;

		border-right: 1px solid $color-border;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
	}

	.sidebar-content {
		min-height: 0;
		flex: 1;
		overflow-y: auto;
	}

	.user-menu {
		margin-top: auto;
		padding-top: 1rem;
		border-top: 1px solid $color-border;
	}

	.user-avatar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.avatar-initials {
		aspect-ratio: 1;
		padding: 0.65rem;
		border-radius: 50%;
		background-color: $color-secondary-background;
		font-weight: 700;
		line-height: 1;
		display: grid;
		place-items: center;
	}

	.avatar-name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 600;
	}

	& main {
		width: 100%;
		height: 100%;
		overflow-y: auto;
		padding: 2rem 3rem calc(2rem + $player-height);
	}
}
</style>
