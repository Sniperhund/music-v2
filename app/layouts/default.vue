<template>
	<Sidebar>
		<template #sidebar>
			<Button>Home</Button>
		</template>

		<template #default>
			<slot />
		</template>
	</Sidebar>
</template>
