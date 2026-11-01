<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" })
useHead({ title: "Admin" })
</script>

<template>
	<section class="admin-home">
		<h1 class="title">Admin Dashboard</h1>
		<h2>Track Verification</h2>
		<p>Review tracks awaiting approval, browse verified tracks, or revisit declined tracks.</p>
		<div class="verification-links">
			<Button
				to="/admin/awaiting-verification"
				type="link"
				icon-name="lucide:badge-alert"
			>
				Awaiting Verification
			</Button>
			<Button
				to="/admin/verified"
				type="link"
				icon-name="lucide:badge-check"
			>
				Verified Tracks
			</Button>
			<Button
				to="/admin/declined"
				type="link"
				icon-name="lucide:badge-x"
			>
				Declined Verification
			</Button>
		</div>
	</section>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;

.title {
	@include fontSize(32px);
	font-weight: 700;
	margin-bottom: 1.5rem;
}

h2 {
	@include fontSize(22px);
	font-weight: 600;
}

.verification-links {
	display: flex;
	flex-wrap: wrap;
	gap: 0.75rem;
	margin-top: 1rem;
}
</style>
