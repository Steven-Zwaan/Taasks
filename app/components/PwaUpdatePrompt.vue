<template>
  <Teleport to="body">
    <Transition name="slide-down">
      <div
        v-if="needRefresh"
        class="fixed top-0 left-0 right-0 bg-blue-500 text-white px-4 py-3 z-50 flex items-center justify-between"
        :style="{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }"
      >
        <span class="text-sm">A new version is available!</span>
        <button
          @click="updateServiceWorker"
          class="bg-white text-blue-500 text-sm font-medium px-4 py-1 rounded-full"
        >
          Update
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { $pwa } = useNuxtApp()

const needRefresh = computed(() => $pwa?.needRefresh?.value ?? false)

function updateServiceWorker() {
  $pwa?.updateServiceWorker()
}
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
}
</style>
