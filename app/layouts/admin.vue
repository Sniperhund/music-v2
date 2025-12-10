<template>
	<Sidebar>
		<template #sidebar>
			<p class="title">Music - Admin</p>

			<div class="category">
				<Button
					full
					variant="ghost"
					to="/admin"
					type="link"
					icon-name="lucide:house"
				>
					Dashboard
				</Button>
			</div>

			<div class="category">
				<p>Manage</p>

				<Button
					full
					variant="ghost"
					to="/admin/artists"
					type="link"
					icon-name="lucide:mic-vocal"
				>
					Manage Artists
				</Button>
				<Button
					full
					variant="ghost"
					to="/admin/albums"
					type="link"
					icon-name="lucide:gallery-vertical-end"
				>
					Manage Albums
				</Button>
				<Button
					full
					variant="ghost"
					to="/admin/songs"
					type="link"
					icon-name="lucide:music"
				>
					Manage Songs
				</Button>
			</div>

			<div class="category">
				<p>Exit</p>

				<Button
					full
					variant="ghost"
					to="/"
					type="link"
					icon-name="lucide:settings-2"
				>
					Exit Admin Panel
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
