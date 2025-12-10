<script setup lang="ts"></script>

<template>
	<Slider title="Folk">
		<AlbumCard
			v-for="index in 10"
			:key="index"
			name="I Know You'll Forget Me"
			file="https://t2.genius.com/unsafe/344x344/https%3A%2F%2Fimages.genius.com%2F837160aed59b6cb52acc489d89e99fa6.1000x998x1.jpg"
			:artists="[
				{ name: 'Kado', _id: '1' },
				{ name: 'Kado', _id: '1' },
			]"
			:genre="{ name: 'Folk', _id: '1' }"
			_id="1"
		/>
	</Slider>
</template>
