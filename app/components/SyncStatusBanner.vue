<template>
  <div
    v-if="syncState !== 'idle'"
    class="sync-indicator"
    :class="{
      'bg-yellow-500': syncState === 'syncing',
      'bg-red-500': syncState === 'error',
      'bg-gray-500': syncState === 'offline',
    }"
  >
    <template v-if="syncState === 'syncing'">
      <span class="inline-flex items-center gap-1">
        <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Syncing...
      </span>
    </template>
    <template v-else-if="syncState === 'offline'">
      Offline — Changes will sync when connected
    </template>
    <template v-else-if="syncState === 'error'">
      Sync error — Will retry automatically
    </template>
  </div>
</template>

<script setup lang="ts">
const { syncState } = useOfflineSync()
</script>
