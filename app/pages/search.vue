<script setup lang="ts">
const route = useRoute()

watchEffect(() => console.log(route.query.q))
</script>

<template></template>
