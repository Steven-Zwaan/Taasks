<template>
  <div class="min-h-screen bg-white flex flex-col">
    <!-- Sync Status Banner -->
    <SyncStatusBanner />

    <!-- Main Content -->
    <main class="flex-1 overflow-hidden">
      <slot />
    </main>

    <!-- Bottom Navigation -->
    <BottomNav />

    <!-- PWA Install Prompt -->
    <PwaInstallPrompt />

    <!-- PWA Update Prompt -->
    <PwaUpdatePrompt />
  </div>
</template>

<script setup lang="ts">
// Process rollover on layout mount
const { doRollover } = useTodos()
const { initialize } = useOfflineSync()
const { isAuthenticated } = useAuth()

onMounted(async () => {
  if (isAuthenticated.value) {
    // Process any pending rollovers
    await doRollover()
    // Initialize sync
    await initialize()
  }
})

// Re-process on visibility change (app comes to foreground)
if (import.meta.client) {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && isAuthenticated.value) {
      await doRollover()
    }
  })
}
</script>
