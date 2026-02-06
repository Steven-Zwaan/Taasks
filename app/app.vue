<template>
  <NuxtPwaManifest />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
// Global app setup
useHead({
  htmlAttrs: {
    lang: 'en',
  },
})
</script>

