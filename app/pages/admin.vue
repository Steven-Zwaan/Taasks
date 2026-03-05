<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-20 pt-safe">
      <div class="flex items-center justify-between px-4 py-3">
        <div class="flex items-center gap-3">
          <NuxtLink to="/settings" class="text-red-500 flex items-center gap-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Settings
          </NuxtLink>
        </div>
        <h1 class="text-lg font-semibold">Admin</h1>
        <div class="w-20" />
      </div>
    </header>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto scroll-smooth-ios overscroll-none">
      <!-- Notifications Section -->
      <div class="mt-6 px-4">
        <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notification Testing</h2>
        <div class="bg-white rounded-xl overflow-hidden border border-gray-200 divide-y divide-gray-200">

          <!-- Diagnostics -->
          <div class="p-4">
            <p class="font-medium mb-2">Diagnostics</p>
            <div class="space-y-1 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-gray-500">Notification API</span>
                <span :class="hasNotificationAPI ? 'text-green-600' : 'text-red-500'" class="font-medium">
                  {{ hasNotificationAPI ? 'Available' : 'Not available' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-500">PushManager API</span>
                <span :class="hasPushManager ? 'text-green-600' : 'text-red-500'" class="font-medium">
                  {{ hasPushManager ? 'Available' : 'Not available' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-500">Permission</span>
                <span
                  class="font-medium"
                  :class="{
                    'text-green-600': notificationPermission === 'granted',
                    'text-yellow-600': notificationPermission === 'default',
                    'text-red-500': notificationPermission === 'denied',
                  }"
                >
                  {{ notificationPermission }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-500">Standalone mode</span>
                <span :class="isStandalone ? 'text-green-600' : 'text-gray-500'" class="font-medium">
                  {{ isStandalone ? 'Yes' : 'No' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-500">Service Worker</span>
                <span :class="swRegistered ? 'text-green-600' : 'text-red-500'" class="font-medium">
                  {{ swRegistered ? 'Registered' : 'Not registered' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Request Permission -->
          <button
            v-if="hasNotificationAPI && notificationPermission !== 'granted'"
            @click="requestPermission"
            class="w-full flex items-center justify-between p-4 text-left"
          >
            <div>
              <p class="text-red-500 font-medium">Request Notification Permission</p>
              <p class="text-sm text-gray-500">Required before testing notifications</p>
            </div>
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          <!-- Test Notification (Browser API) -->
          <button
            @click="sendTestNotification"
            :disabled="notificationPermission !== 'granted'"
            class="w-full flex items-center justify-between p-4 text-left disabled:opacity-50"
          >
            <div>
              <p class="text-red-500 font-medium">Test Notification (Browser)</p>
              <p class="text-sm text-gray-500">Send a local notification using the Notification API</p>
            </div>
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>

          <!-- Test Notification (Service Worker) -->
          <button
            @click="sendSWNotification"
            :disabled="notificationPermission !== 'granted' || !swRegistered"
            class="w-full flex items-center justify-between p-4 text-left disabled:opacity-50"
          >
            <div>
              <p class="text-red-500 font-medium">Test Notification (Service Worker)</p>
              <p class="text-sm text-gray-500">Send via Service Worker — works when app is in background</p>
            </div>
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Result / Feedback -->
      <div v-if="lastResult" class="mt-4 px-4">
        <div
          class="p-4 rounded-xl text-sm"
          :class="lastResultSuccess ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'"
        >
          {{ lastResult }}
        </div>
      </div>

      <!-- User Info (debug) -->
      <div class="mt-6 px-4 mb-8">
        <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Debug Info</h2>
        <div class="bg-white rounded-xl overflow-hidden border border-gray-200 p-4">
          <p class="text-sm text-gray-500 font-mono break-all">User ID: {{ user?.id }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const ADMIN_USER_ID = 'google-oauth2|108099838475512595328'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useAuth()

// Gate: redirect non-admin users
onMounted(() => {
  if (user.value?.id !== ADMIN_USER_ID) {
    navigateTo('/')
  }
})

// Also watch for auth changes
watch(() => user.value?.id, (id) => {
  if (id && id !== ADMIN_USER_ID) {
    navigateTo('/')
  }
})

// Notification state
const hasNotificationAPI = ref(false)
const hasPushManager = ref(false)
const notificationPermission = ref<NotificationPermission>('default')
const isStandalone = ref(false)
const swRegistered = ref(false)
const swRegistration = ref<ServiceWorkerRegistration | null>(null)
const lastResult = ref('')
const lastResultSuccess = ref(false)

onMounted(async () => {
  // Check capabilities
  hasNotificationAPI.value = typeof Notification !== 'undefined'
  hasPushManager.value = 'PushManager' in window
  isStandalone.value =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true

  if (hasNotificationAPI.value) {
    notificationPermission.value = Notification.permission
  }

  // Check service worker registration
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        swRegistered.value = true
        swRegistration.value = registration
      } else {
        swRegistered.value = false
      }
    } catch {
      swRegistered.value = false
    }
  }
})

async function requestPermission() {
  if (!hasNotificationAPI.value) return

  try {
    const permission = await Notification.requestPermission()
    notificationPermission.value = permission
    if (permission === 'granted') {
      lastResult.value = 'Permission granted! You can now test notifications.'
      lastResultSuccess.value = true
    } else if (permission === 'denied') {
      lastResult.value = 'Permission denied. You\'ll need to enable it in your browser/device settings.'
      lastResultSuccess.value = false
    } else {
      lastResult.value = 'Permission dismissed. Try again.'
      lastResultSuccess.value = false
    }
  } catch (err: any) {
    lastResult.value = `Error requesting permission: ${err.message}`
    lastResultSuccess.value = false
  }
}

function sendTestNotification() {
  if (notificationPermission.value !== 'granted') {
    lastResult.value = 'Notification permission not granted.'
    lastResultSuccess.value = false
    return
  }

  try {
    const notification = new Notification('Todo App Test', {
      body: 'This is a test notification from the Browser Notification API. ' + new Date().toLocaleTimeString(),
      icon: '/pwa-192x192.svg',
      badge: '/pwa-192x192.svg',
      tag: 'test-notification',
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    lastResult.value = 'Browser notification sent successfully!'
    lastResultSuccess.value = true
  } catch (err: any) {
    lastResult.value = `Error sending notification: ${err.message}`
    lastResultSuccess.value = false
  }
}

async function sendSWNotification() {
  if (notificationPermission.value !== 'granted') {
    lastResult.value = 'Notification permission not granted.'
    lastResultSuccess.value = false
    return
  }

  if (!swRegistration.value) {
    lastResult.value = 'Service worker not registered.'
    lastResultSuccess.value = false
    return
  }

  try {
    await swRegistration.value.showNotification('Todo App Test (SW)', {
      body: 'This notification was sent via the Service Worker. It works even when the app is in the background! ' + new Date().toLocaleTimeString(),
      icon: '/pwa-192x192.svg',
      badge: '/pwa-192x192.svg',
      tag: 'test-sw-notification',
      data: { url: '/admin' },
    })

    lastResult.value = 'Service Worker notification sent successfully! Try minimizing the app to test background delivery.'
    lastResultSuccess.value = true
  } catch (err: any) {
    lastResult.value = `Error sending SW notification: ${err.message}`
    lastResultSuccess.value = false
  }
}
</script>
