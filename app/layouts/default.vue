<script setup lang="ts">
const router = useRouter()
const route = useRoute()

const activeTab = computed(() => {
	if (route.path === "/") return "home"
	if (route.path === "/search") return "search"
	if (route.path.startsWith("/library/")) return "library"
	return ""
})

let timeout: ReturnType<typeof setTimeout>

const onSearchInput = (v: string) => {
	clearTimeout(timeout)
	timeout = setTimeout(() => {
		if (v && v.trim() !== "")
			router.replace(`/search?q=${encodeURIComponent(v)}`)
		else router.replace("/search")
	}, 300)
}

const { data: user } = useApiFetch<any>("/user")
const song = useSong()
</script>

<template>
	<Sidebar class="default-shell" :class="{ 'has-player': song }">
		<template #sidebar>
			<p class="title">Music</p>

			<Input
				class="search-input"
				icon-name="lucide:search"
				placeholder="Search..."
				@input="onSearchInput"
				@focus="router.replace('/search')"
			/>

			<div class="category">
				<Button
					full
					variant="ghost"
					to="/"
					type="link"
					icon-name="lucide:house"
				>
					Home
				</Button>
			</div>

			<div class="category">
				<p>Library</p>

				<Button
					full
					variant="ghost"
					to="/library/artists"
					type="link"
					icon-name="lucide:mic-vocal"
				>
					Artists
				</Button>
				<Button
					full
					variant="ghost"
					to="/library/albums"
					type="link"
					icon-name="lucide:gallery-vertical-end"
				>
					Albums
				</Button>
				<Button
					full
					variant="ghost"
					to="/library/songs"
					type="link"
					icon-name="lucide:music"
				>
					Songs
				</Button>
			</div>

			<div v-if="user?.role == 'admin'" class="category">
				<p>Secret stuff</p>

				<Button
					full
					variant="ghost"
					to="/admin"
					type="link"
					icon-name="lucide:settings-2"
				>
					Go To Admin Panel
				</Button>
			</div>
		</template>

		<template #default>
			<slot />

			<nav class="mobile-tabs" aria-label="Primary navigation">
				<NuxtLink
					to="/"
					class="tab"
					:class="{ active: activeTab === 'home' }"
					:aria-current="activeTab === 'home' ? 'page' : undefined"
				>
					<Icon
						name="lucide:house"
						class="tab-icon"
						aria-hidden="true"
					/>
					<span>Home</span>
				</NuxtLink>
				<NuxtLink
					to="/library/songs"
					class="tab"
					:class="{ active: activeTab === 'library' }"
					:aria-current="activeTab === 'library' ? 'page' : undefined"
				>
					<Icon
						name="lucide:library"
						class="tab-icon"
						aria-hidden="true"
					/>
					<span>Library</span>
				</NuxtLink>
				<NuxtLink
					to="/search"
					class="tab"
					:class="{ active: activeTab === 'search' }"
					:aria-current="activeTab === 'search' ? 'page' : undefined"
				>
					<Icon
						name="lucide:search"
						class="tab-icon"
						aria-hidden="true"
					/>
					<span>Search</span>
				</NuxtLink>
			</nav>
		</template>
	</Sidebar>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;
@use "@/styles/variables" as *;

.title {
	@include fontSize(24px);
}

.search-input,
.title {
	margin-bottom: 1rem;
}

.category {
	margin-bottom: 0.8rem;

	& > p {
		@include fontSize(13px);
		font-weight: 600;
		margin-bottom: 0.1rem;
	}
}

.mobile-tabs {
	display: none;
}

@media (max-width: 767px) {
	.default-shell {
		display: block;
		overflow: hidden;

		:deep(> aside) {
			display: none;
		}

		:deep(> main) {
			padding: calc(1.25rem + env(safe-area-inset-top)) 1rem
				calc(6rem + env(safe-area-inset-bottom));
		}

		&.has-player :deep(> main) {
			padding-bottom: calc(6rem + env(safe-area-inset-bottom) + $player-height);
		}
	}

	.mobile-tabs {
		position: fixed;
		z-index: 100;
		inset: auto 0 0;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		padding: 0.45rem 0.75rem calc(0.45rem + env(safe-area-inset-bottom));
		border-top: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(22, 22, 24, 0.96);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
	}

	.tab {
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		border-radius: 0.65rem;
		color: rgba(255, 255, 255, 0.62);
		text-decoration: none;
		font-size: 0.75rem;
		font-weight: 600;
		-webkit-tap-highlight-color: transparent;

		.tab-icon {
			font-size: 1.75rem;
		}

		&.active {
			color: white;
		}
	}
}
</style>
