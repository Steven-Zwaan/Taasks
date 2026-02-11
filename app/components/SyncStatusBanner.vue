<template>
  <div>
    <!-- Temporary notification banner -->
    <Transition name="slide">
      <div
        v-if="showTemporaryBanner && temporaryBannerState"
        class="sync-indicator"
        :class="{
          'bg-blue-500': temporaryBannerState === 'syncing',
          'bg-red-500': temporaryBannerState === 'error',
          'bg-gray-500': temporaryBannerState === 'offline',
          'bg-green-500': temporaryBannerState === 'online',
        }"
      >
        <template v-if="temporaryBannerState === 'syncing'">
          <span class="inline-flex items-center gap-1">
            <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Syncing...
          </span>
        </template>
        <template v-else-if="temporaryBannerState === 'offline'">
          You are offline
        </template>
        <template v-else-if="temporaryBannerState === 'online'">
          Back online
        </template>
        <template v-else-if="temporaryBannerState === 'error'">
          Sync error
        </template>
      </div>
    </Transition>

    <!-- Persistent error banner (once per session) -->
    <Transition name="slide">
      <div
        v-if="syncErrorMessage"
        class="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white text-sm py-2 px-4 flex items-center justify-between pt-safe"
      >
        <span class="flex-1">{{ syncErrorMessage }}</span>
        <button 
          @click="dismissError"
          class="ml-2 p-1 hover:bg-red-600 rounded"
          aria-label="Dismiss"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const { showTemporaryBanner, temporaryBannerState, syncErrorMessage, dismissError } = useOfflineSync()
</script>

<style scoped>
.sync-indicator {
  @apply fixed top-0 left-0 right-0 z-40 text-white text-sm text-center py-1 pt-safe;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
