<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-20 pt-safe">
      <div class="flex items-center justify-between px-4 py-3">
        <h1 class="text-2xl font-bold">Settings</h1>
      </div>
    </header>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto scroll-smooth-ios overscroll-none pb-20">
      <!-- Account Section -->
      <div class="mt-6 px-4">
        <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Account</h2>
        <div class="bg-white rounded-xl overflow-hidden border border-gray-200">
          <div class="flex items-center gap-4 p-4">
            <img
              v-if="user?.picture"
              :src="user.picture"
              :alt="user.name"
              class="w-12 h-12 rounded-full"
            />
            <div v-else class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ user?.name ?? 'User' }}</p>
              <p class="text-sm text-gray-500 truncate">{{ user?.email }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Notifications Section -->
      <div class="mt-6 px-4">
        <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notifications</h2>
        <div class="bg-white rounded-xl overflow-hidden border border-gray-200 divide-y divide-gray-200">
          <!-- Enable notifications -->
          <div class="flex items-center justify-between p-4">
            <div>
              <p class="font-medium">Daily Reminder</p>
              <p class="text-sm text-gray-500">Get reminded of your todos</p>
            </div>
            <button
              @click="toggleNotifications"
              class="relative w-12 h-7 rounded-full transition-colors"
              :class="notificationsEnabled ? 'bg-green-500' : 'bg-gray-300'"
            >
              <span
                class="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform"
                :class="notificationsEnabled ? 'left-5' : 'left-0.5'"
              />
            </button>
          </div>

          <!-- Reminder time -->
          <div v-if="notificationsEnabled" class="flex items-center justify-between p-4">
            <div>
              <p class="font-medium">Reminder Time</p>
              <p class="text-sm text-gray-500">When to receive the reminder</p>
            </div>
            <input
              v-model="reminderTime"
              type="time"
              class="text-red-500 font-medium bg-transparent"
              @change="saveReminderTime"
            />
          </div>

          <!-- Push permission status -->
          <div v-if="!isPushSupported" class="p-4 bg-yellow-50">
            <p class="text-sm text-yellow-800">
              <strong>Note:</strong> Push notifications require the app to be installed on your home screen.
            </p>
          </div>
        </div>
      </div>

      <!-- Sync Section -->
      <div class="mt-6 px-4">
        <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sync</h2>
        <div class="bg-white rounded-xl overflow-hidden border border-gray-200 divide-y divide-gray-200">
          <!-- Sync status -->
          <div class="flex items-center justify-between p-4">
            <div>
              <p class="font-medium">Sync Status</p>
              <p class="text-sm text-gray-500">
                <template v-if="syncState === 'idle'">Everything is synced</template>
                <template v-else-if="syncState === 'syncing'">Syncing...</template>
                <template v-else-if="syncState === 'offline'">Offline - changes saved locally</template>
                <template v-else-if="syncState === 'error'">Sync error - retrying automatically</template>
                <template v-else-if="syncState === 'pending'">Changes pending sync</template>
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="w-3 h-3 rounded-full"
                :class="{
                  'bg-green-500': syncState === 'idle',
                  'bg-blue-500 animate-pulse': syncState === 'syncing' || syncState === 'pending',
                  'bg-gray-400': syncState === 'offline',
                  'bg-red-500': syncState === 'error',
                }"
              />
            </div>
          </div>

          <!-- Pending changes -->
          <div v-if="pendingCount > 0" class="flex items-center justify-between p-4">
            <div>
              <p class="font-medium">Pending Changes</p>
              <p class="text-sm text-gray-500">{{ pendingCount }} changes waiting to sync</p>
            </div>
          </div>

          <!-- Last synced -->
          <div v-if="lastSyncAt" class="flex items-center justify-between p-4">
            <div>
              <p class="font-medium">Last Synced</p>
              <p class="text-sm text-gray-500">{{ formatLastSync(lastSyncAt) }}</p>
            </div>
          </div>

          <!-- Force sync -->
          <button
            @click="handleFullSync"
            :disabled="syncState === 'syncing' || !isOnline"
            class="w-full flex items-center justify-between p-4 text-left disabled:opacity-50"
          >
            <span class="text-red-500 font-medium">Force Full Sync</span>
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="mt-6 px-4 mb-8">
        <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Account</h2>
        <div class="bg-white rounded-xl overflow-hidden border border-gray-200">
          <button
            @click="handleLogout"
            class="w-full flex items-center justify-between p-4 text-left"
          >
            <span class="text-red-500 font-medium">Sign Out</span>
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { db } from '~/utils/db'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user, logout } = useAuth()
const { clearLocalTodos } = useTodos()
const { syncState, pendingCount, lastSyncAt, isOnline, fullSync } = useOfflineSync()

const notificationsEnabled = ref(false)
const reminderTime = ref('09:00')

const isPushSupported = computed(() => {
  if (typeof window === 'undefined') return false
  return 'Notification' in window && 'PushManager' in window
})

const isStandalone = computed(() => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
})

// Load settings on mount
onMounted(async () => {
  if (user.value?.id) {
    const settings = await db.settings.get(user.value.id)
    if (settings) {
      notificationsEnabled.value = settings.dailyReminderEnabled
      reminderTime.value = settings.dailyReminderTime
    }
  }
})

async function toggleNotifications() {
  if (!notificationsEnabled.value && isPushSupported.value) {
    // Request permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return
    }
  }

  notificationsEnabled.value = !notificationsEnabled.value
  await saveSettings()
}

async function saveReminderTime() {
  await saveSettings()
}

async function saveSettings() {
  if (!user.value?.id) return

  const existing = await db.settings.get(user.value.id)
  const settings = {
    userId: user.value.id,
    dailyReminderEnabled: notificationsEnabled.value,
    dailyReminderTime: reminderTime.value,
    lastSyncAt: existing?.lastSyncAt,
    theme: existing?.theme ?? 'system' as const,
  }

  if (existing) {
    await db.settings.update(user.value.id, settings)
  } else {
    await db.settings.add(settings)
  }
}

function formatLastSync(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`
  return date.toLocaleDateString()
}

async function handleFullSync() {
  await fullSync()
}

async function handleLogout() {
  await clearLocalTodos()
  await logout()
}
</script>
