<script setup lang="ts">
const router = useRouter()

let timeout: ReturnType<typeof setTimeout>

const onSearchInput = (v: string) => {
	clearTimeout(timeout)
	timeout = setTimeout(() => {
		if (v && v.trim() !== "")
			router.replace(`/search?q=${encodeURIComponent(v)}`)
		else router.replace("/search")
	}, 300)
}
</script>

<template>
	<Sidebar>
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
		</template>

		<template #default>
			<slot />
		</template>
	</Sidebar>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;

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
</style>
