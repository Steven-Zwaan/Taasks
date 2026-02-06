<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-6">
    <div class="w-full max-w-sm text-center">
      <!-- App Icon -->
      <div class="mb-8">
        <div class="w-20 h-20 mx-auto bg-red-500 rounded-2xl flex items-center justify-center shadow-lg">
          <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
      </div>

      <h1 class="text-2xl font-bold text-gray-900 mb-2">Todo App</h1>
      <p class="text-gray-500 mb-8">Stay organized, anywhere.</p>

      <!-- Login buttons -->
      <div class="space-y-3">
        <button
          @click="handleLogin"
          :disabled="isLoading"
          class="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-xl py-3 px-4 font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span>{{ isLoading ? 'Signing in...' : 'Continue with Google' }}</span>
        </button>

        <button
          @click="handleLogin"
          :disabled="isLoading"
          class="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-xl py-3 px-4 font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#00A4EF" d="M11.4 24H0V12.6h11.4V24z" />
            <path fill="#FFB900" d="M24 24H12.6V12.6H24V24z" />
            <path fill="#F25022" d="M11.4 11.4H0V0h11.4v11.4z" />
            <path fill="#7FBA00" d="M24 11.4H12.6V0H24v11.4z" />
          </svg>
          <span>{{ isLoading ? 'Signing in...' : 'Continue with Microsoft' }}</span>
        </button>
      </div>

      <p class="mt-8 text-xs text-gray-400">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
})

const { login, isLoading, isAuthenticated } = useAuth()

// Redirect if already authenticated
watch(isAuthenticated, (authenticated) => {
  if (authenticated) {
    navigateTo('/')
  }
}, { immediate: true })

async function handleLogin() {
  await login()
}
</script>
