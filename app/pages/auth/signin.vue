<script setup lang="ts">
const auth = useAuth()
const toast = useToast()

const submit = async (e: any) => {
	let data: any

	try {
		data = Object.fromEntries(new FormData(e?.target as HTMLFormElement))
	} catch {}

	try {
		await auth.signin(data.email, data.password, data.remember === "on")
	} catch (e: string | any) {
		toast.show(e, "error")
	}
}
useHead({ title: "Sign In" })
</script>

<template>
	<h1>Welcome back!</h1>

	<form @submit.prevent="submit" class="form">
		<Input placeholder="E-mail" type="email" name="email" full required>
			<template #label>Email address</template>
		</Input>
		<Input
			placeholder="Password"
			type="password"
			name="password"
			full
			required
		>
			<template #label>Password</template>
		</Input>

		<Checkbox name="remember" label="Remember me?" />

		<Button full center-text type="submit">Sign in</Button>

		<p>Sorry, but registrations are closed</p>
	</form>
</template>

<style lang="scss" scoped>
@use "@/styles/util" as *;

h1 {
	@include fontSize(24px);
	font-weight: 600;
	margin-bottom: 0.8em;
	text-align: center;
}

.form {
	display: flex;
	flex-direction: column;
	gap: 0.8rem;
}
</style>
