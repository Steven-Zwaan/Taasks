<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-20 pt-safe">
      <div class="flex items-center justify-between px-4 py-3">
        <div class="flex items-center gap-3">
          <NuxtLink to="/" class="text-red-500 flex items-center gap-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Today
          </NuxtLink>
        </div>
        <div class="flex items-center gap-2">
          <button @click="scrollToToday" class="px-3 py-1 text-sm text-red-500 font-medium rounded-full hover:bg-gray-100">
            Now
          </button>
          <button @click="showSearch = !showSearch" class="p-2 rounded-full hover:bg-gray-100">
            <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button @click="openAddForm" class="p-2 rounded-full hover:bg-gray-100">
            <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Search bar -->
      <div v-if="showSearch" class="px-4 pb-3">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search todos..."
          class="input-ios"
          autofocus
        />
      </div>
    </header>

    <!-- Content -->
    <div ref="scrollContainer" class="flex-1 overflow-y-auto scroll-smooth-ios overscroll-none pb-20">
      <!-- Top sentinel for loading older chunks -->
      <div ref="topSentinel" class="h-1" />

      <!-- Loading older indicator -->
      <div v-if="loadingOlder" class="flex items-center justify-center py-3 text-gray-400">
        <svg class="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span class="text-sm">Loading earlier dates...</span>
      </div>

      <!-- Chunks -->
      <CalendarChunk
        v-for="chunk in chunks"
        :key="chunk.id"
        :ref="el => setChunkRef(chunk.id, el)"
        :start-date="chunk.start"
        :end-date="chunk.end"
        :search-query="searchQuery"
        @edit="openEditForm"
      />

      <!-- Empty state (only shown when all chunks are loaded and truly empty) -->
      <div v-if="chunks.length > 0 && !hasAnyContent" class="flex flex-col items-center justify-center py-20 text-gray-400 px-8">
        <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p class="text-lg font-medium">No scheduled todos</p>
        <p class="text-sm mt-1">Tap + to schedule a todo</p>
      </div>

      <!-- Loading newer indicator -->
      <div v-if="loadingNewer" class="flex items-center justify-center py-3 text-gray-400">
        <svg class="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span class="text-sm">Loading more dates...</span>
      </div>

      <!-- Bottom sentinel for loading newer chunks -->
      <div ref="bottomSentinel" class="h-1" />
    </div>

    <!-- Add/Edit Form -->
    <TodoForm
      :is-open="showForm"
      :editing-todo="editingTodo"
      default-scope="day"
      :default-date="selectedDate"
      @close="closeForm"
    />
  </div>
</template>

<script setup lang="ts">
import type { Todo } from '#shared/types'
import { today as getToday, addDays } from '~/utils/db'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const CHUNK_DAYS = 7
const MAX_CHUNKS = 8

interface ChunkDescriptor {
  id: string
  start: string
  end: string
}

const today = getToday()
const showSearch = ref(false)
const searchQuery = ref('')
const showForm = ref(false)
const editingTodo = ref<Todo | null>(null)
const selectedDate = ref(today)
const loadingOlder = ref(false)
const loadingNewer = ref(false)
const initialized = ref(false)

// Scroll container and sentinel refs
const scrollContainer = ref<HTMLElement | null>(null)
const topSentinel = ref<HTMLElement | null>(null)
const bottomSentinel = ref<HTMLElement | null>(null)

// Track chunk component refs to find today element
const chunkRefs = new Map<string, any>()

function setChunkRef(id: string, el: any) {
  if (el) chunkRefs.set(id, el)
  else chunkRefs.delete(id)
}

// For the empty state — check if any chunk has content
// This is a simple heuristic: we show the empty state only briefly on initial load
const hasAnyContent = ref(true)

function createChunk(start: string, end: string): ChunkDescriptor {
  return { id: `${start}_${end}`, start, end }
}

function buildInitialChunks(): ChunkDescriptor[] {
  return [
    createChunk(addDays(today, -CHUNK_DAYS), addDays(today, -1)),
    createChunk(today, addDays(today, CHUNK_DAYS - 1)),
    createChunk(addDays(today, CHUNK_DAYS), addDays(today, CHUNK_DAYS * 2 - 1)),
  ]
}

const chunks = ref<ChunkDescriptor[]>(buildInitialChunks())

// IntersectionObserver for infinite scroll
let topObserver: IntersectionObserver | null = null
let bottomObserver: IntersectionObserver | null = null

function prependChunk() {
  if (loadingOlder.value) return
  loadingOlder.value = true

  const first = chunks.value[0]!
  const newEnd = addDays(first.start, -1)
  const newStart = addDays(newEnd, -(CHUNK_DAYS - 1))

  const container = scrollContainer.value
  const prevHeight = container?.scrollHeight ?? 0

  chunks.value.unshift(createChunk(newStart, newEnd))

  // Prune from the other end if over max
  if (chunks.value.length > MAX_CHUNKS) {
    chunks.value.pop()
  }

  // Restore scroll position after prepending
  nextTick(() => {
    requestAnimationFrame(() => {
      if (container) {
        const newHeight = container.scrollHeight
        container.scrollTop += (newHeight - prevHeight)
      }
      loadingOlder.value = false
    })
  })
}

function appendChunk() {
  if (loadingNewer.value) return
  loadingNewer.value = true

  const last = chunks.value[chunks.value.length - 1]!
  const newStart = addDays(last.end, 1)
  const newEnd = addDays(newStart, CHUNK_DAYS - 1)

  chunks.value.push(createChunk(newStart, newEnd))

  // Prune from the other end if over max
  if (chunks.value.length > MAX_CHUNKS) {
    const container = scrollContainer.value
    const prevHeight = container?.scrollHeight ?? 0

    chunks.value.shift()

    nextTick(() => {
      requestAnimationFrame(() => {
        if (container) {
          const newHeight = container.scrollHeight
          container.scrollTop += (newHeight - prevHeight)
        }
      })
    })
  }

  nextTick(() => {
    loadingNewer.value = false
  })
}

function setupObservers() {
  const container = scrollContainer.value
  if (!container) return

  const options: IntersectionObserverInit = {
    root: container,
    rootMargin: '200px 0px',
    threshold: 0,
  }

  topObserver = new IntersectionObserver((entries) => {
    if (!initialized.value) return
    for (const entry of entries) {
      if (entry.isIntersecting) {
        prependChunk()
      }
    }
  }, options)

  bottomObserver = new IntersectionObserver((entries) => {
    if (!initialized.value) return
    for (const entry of entries) {
      if (entry.isIntersecting) {
        appendChunk()
      }
    }
  }, options)

  if (topSentinel.value) topObserver.observe(topSentinel.value)
  if (bottomSentinel.value) bottomObserver.observe(bottomSentinel.value)
}

function scrollToToday() {
  // Check if today is within the loaded chunk range
  const first = chunks.value[0]
  const last = chunks.value[chunks.value.length - 1]

  if (!first || !last || today < first.start || today > last.end) {
    // Reset to initial chunks centered on today
    chunks.value = buildInitialChunks()
    nextTick(() => {
      nextTick(() => {
        doScrollToTodayEl()
      })
    })
    return
  }

  doScrollToTodayEl()
}

function doScrollToTodayEl() {
  // Find the chunk component that contains today and get its todayRef
  for (const [, comp] of chunkRefs) {
    const el = comp?.todayRef
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
  }
  // If today has no todos, just scroll to approximate position
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = 0
  }
}

onMounted(() => {
  // Scroll to today after initial render
  nextTick(() => {
    nextTick(() => {
      doScrollToTodayEl()

      // Enable observers after a delay to prevent immediate triggering
      setTimeout(() => {
        initialized.value = true
        setupObservers()
      }, 300)
    })
  })

  // Check for empty state after data loads
  setTimeout(() => {
    hasAnyContent.value = chunkRefs.size > 0
  }, 1000)
})

onUnmounted(() => {
  topObserver?.disconnect()
  bottomObserver?.disconnect()
})

function openAddForm(_event?: Event, date?: string) {
  editingTodo.value = null
  selectedDate.value = date ?? today
  showForm.value = true
}

function openEditForm(todo: Todo) {
  editingTodo.value = todo
  selectedDate.value = todo.dueDate ?? today
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingTodo.value = null
}
</script>
