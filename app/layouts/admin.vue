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
					to="/admin/genre"
					type="link"
					icon-name="lucide:disc-3"
				>
					Genres
				</Button>
				<Button
					full
					variant="ghost"
					to="/admin/artists"
					type="link"
					icon-name="lucide:mic-vocal"
				>
					Artists
				</Button>
				<Button
					full
					variant="ghost"
					to="/admin/albums"
					type="link"
					icon-name="lucide:gallery-vertical-end"
				>
					Albums
				</Button>
				<Button
					full
					variant="ghost"
					to="/admin/songs"
					type="link"
					icon-name="lucide:music"
				>
					Songs
				</Button>
			</div>

			<div class="category">
				<p>Verification</p>

				<Button
					full
					variant="ghost"
					to="/admin/awaiting-verification"
					type="link"
					icon-name="lucide:badge-alert"
				>
					Awaiting Verification
				</Button>
				<Button
					full
					variant="ghost"
					to="/admin/missing-lyrics"
					type="link"
					icon-name="lucide:file-question"
				>
					Missing Lyrics
				</Button>
				<Button
					full
					variant="ghost"
					to="/admin/verified"
					type="link"
					icon-name="lucide:badge-check"
				>
					Verified Tracks
				</Button>
				<Button
					full
					variant="ghost"
					to="/admin/minor-changes"
					type="link"
					icon-name="lucide:badge-alert"
				>
					Lyrics: Minor Changes Required
				</Button>
				<Button
					full
					variant="ghost"
					to="/admin/declined"
					type="link"
					icon-name="lucide:badge-x"
				>
					Declined Verification
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
