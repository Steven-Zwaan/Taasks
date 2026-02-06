<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showPrompt" class="modal-backdrop" @click="dismiss" />
    </Transition>
    
    <Transition name="slide-up">
      <div v-if="showPrompt" class="modal-sheet animate-slide-up">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">Install Todo App</h2>
            <button @click="dismiss" class="text-gray-400">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <p class="text-gray-600 mb-6">
            Install this app on your home screen for the best experience with offline support and notifications.
          </p>

          <!-- iOS Instructions -->
          <div v-if="isIOS" class="bg-gray-50 rounded-xl p-4 mb-4">
            <p class="text-sm text-gray-700 mb-3">To install on iOS:</p>
            <ol class="text-sm text-gray-600 space-y-2">
              <li class="flex items-start gap-2">
                <span class="bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
                <span>Tap the <strong>Share</strong> button
                  <svg class="inline w-4 h-4 mx-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 5l-1.42 1.42-1.59-1.59V16h-2V4.83L9.41 6.42 8 5l4-4 4 4zm4 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2V10a2 2 0 012-2h3v2H6v11h12V10h-3V8h3a2 2 0 012 2z"/>
                  </svg>
                </span>
              </li>
              <li class="flex items-start gap-2">
                <span class="bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
                <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
              </li>
              <li class="flex items-start gap-2">
                <span class="bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
                <span>Tap <strong>"Add"</strong> to confirm</span>
              </li>
            </ol>
          </div>

          <!-- Standard install button (non-iOS) -->
          <button
            v-if="!isIOS && canInstall"
            @click="install"
            class="w-full bg-red-500 text-white font-medium py-3 rounded-xl active:bg-red-600 transition-colors"
          >
            Install App
          </button>

          <button
            @click="dismiss"
            class="w-full text-gray-500 font-medium py-3 mt-2"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const showPrompt = ref(false)
const canInstall = ref(false)
let deferredPrompt: any = null

const isIOS = computed(() => {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
})

const isStandalone = computed(() => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
})

onMounted(() => {
  // Don't show if already installed
  if (isStandalone.value) return

  // Check if we should show the prompt (not dismissed recently)
  const dismissed = localStorage.getItem('pwa-install-dismissed')
  if (dismissed) {
    const dismissedAt = new Date(dismissed)
    const daysSinceDismissed = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceDismissed < 7) return
  }

  // Listen for beforeinstallprompt (non-iOS)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    canInstall.value = true
    showPrompt.value = true
  })

  // Show iOS prompt after delay
  if (isIOS.value) {
    setTimeout(() => {
      showPrompt.value = true
    }, 3000)
  }
})

async function install() {
  if (!deferredPrompt) return
  
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  
  if (outcome === 'accepted') {
    showPrompt.value = false
  }
  
  deferredPrompt = null
  canInstall.value = false
}

function dismiss() {
  showPrompt.value = false
  localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
