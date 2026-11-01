<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" })
await navigateTo("/admin/awaiting-verification", { redirectCode: 301 })
</script>
