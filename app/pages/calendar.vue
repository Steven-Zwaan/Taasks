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

    <!-- Scroll container -->
    <div ref="scrollContainer" class="flex-1 overflow-y-auto overscroll-none pb-20">
      <!-- Top sentinel -->
      <div ref="topSentinel" class="h-1" />

      <!-- Loading older indicator -->
      <div v-if="loadingOlder" class="flex items-center justify-center py-3 text-gray-400">
        <svg class="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span class="text-sm">Loading earlier dates...</span>
      </div>

      <!-- Day blocks -->
      <template v-for="day in displayedDays" :key="day.date">
        <!-- Non-sticky scroll anchor for today -->
        <div v-if="day.isToday" :ref="el => { todayEl = el as HTMLElement }" class="h-0" />

        <!-- Sticky day header -->
        <div
          class="date-header"
          :class="{ 'text-red-500': day.isToday }"
        >
          <div class="flex items-center gap-2">
            <span v-if="day.isToday" class="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <span>{{ day.label }}</span>
            <span class="text-gray-400 ml-auto font-normal normal-case tracking-normal">{{ day.shortDate }}</span>
          </div>
        </div>

        <!-- Day content -->
        <div
          class="px-4 py-2"
          :class="{ 'bg-red-50/50': day.isToday }"
        >
          <TodoItem
            v-for="todo in day.todos"
            :key="todo.id"
            :todo="todo"
            @edit="openEditForm"
          />

          <p v-if="day.isToday && day.todos.length === 0" class="text-sm text-gray-400 py-2">
            No todos for today
          </p>
        </div>
      </template>

      <!-- Empty state -->
      <div v-if="displayedDays.length === 0 && !loadingOlder && !loadingNewer" class="flex flex-col items-center justify-center py-20 text-gray-400 px-8">
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

      <!-- Bottom sentinel -->
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
import { liveQuery } from 'dexie'
import type { Todo } from '#shared/types'
import { db, today as getToday, formatDate, addDays } from '~/utils/db'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const PAGE_SIZE = 10

const { user } = useAuth()
const userId = computed(() => user.value?.id ?? '')

const todayStr = getToday()
const showSearch = ref(false)
const searchQuery = ref('')
const showForm = ref(false)
const editingTodo = ref<Todo | null>(null)
const selectedDate = ref(todayStr)
const loadingOlder = ref(false)
const loadingNewer = ref(false)
const initialized = ref(false)

// Scroll container and sentinel refs
const scrollContainer = ref<HTMLElement | null>(null)
const topSentinel = ref<HTMLElement | null>(null)
const bottomSentinel = ref<HTMLElement | null>(null)
const todayEl = ref<HTMLElement | null>(null)

// Day range tracking (offsets from today)
const topOffset = ref(-PAGE_SIZE)
const bottomOffset = ref(PAGE_SIZE)

// Computed date range
const startDate = computed(() => addDays(todayStr, topOffset.value))
const endDate = computed(() => addDays(todayStr, bottomOffset.value))

// Reactive todo data from Dexie
const groupedTodos = ref<Map<string, Todo[]>>(new Map())
let subscription: { unsubscribe(): void } | null = null

function subscribe() {
  subscription?.unsubscribe()

  const uid = userId.value
  if (!uid) return

  const start = startDate.value
  const end = endDate.value

  const obs = liveQuery(async () => {
    const todos = await db.todos
      .where('[userId+dueDate]')
      .between([uid, start], [uid, end], true, true)
      .filter(todo => todo.syncStatus !== 'deleted')
      .toArray()

    const grouped = new Map<string, Todo[]>()
    for (const todo of todos) {
      if (!todo.dueDate) continue
      const existing = grouped.get(todo.dueDate) ?? []
      existing.push(todo)
      grouped.set(todo.dueDate, existing)
    }
    for (const [, dateTodos] of grouped) {
      dateTodos.sort((a, b) => a.sortOrder - b.sortOrder)
    }
    return grouped
  })

  subscription = obs.subscribe({
    next: (val) => { groupedTodos.value = val },
    error: (err) => { console.error('Calendar query error:', err) },
  })
}

// Displayed days: skip empty dates (except today), apply search filter
const displayedDays = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const days: Array<{
    date: string
    label: string
    shortDate: string
    isToday: boolean
    isPast: boolean
    todos: Todo[]
  }> = []

  const sortedDates = [...groupedTodos.value.keys()].sort()

  for (const date of sortedDates) {
    let todos = groupedTodos.value.get(date) ?? []

    if (query) {
      todos = todos.filter(t => t.title.toLowerCase().includes(query))
      if (todos.length === 0) continue
    }

    days.push({
      date,
      label: formatDate(date),
      shortDate: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      isToday: date === todayStr,
      isPast: date < todayStr,
      todos,
    })
  }

  // Always include today even if it has no todos (unless searching)
  if (!query && !days.find(d => d.isToday)) {
    const todayEntry = {
      date: todayStr,
      label: 'Today',
      shortDate: new Date(todayStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      isToday: true,
      isPast: false,
      todos: [] as Todo[],
    }
    const insertIdx = days.findIndex(d => d.date > todayStr)
    if (insertIdx === -1) {
      days.push(todayEntry)
    } else {
      days.splice(insertIdx, 0, todayEntry)
    }
  }

  return days
})

// Scroll preservation for prepend
let prevScrollHeight = 0
let pendingScrollFix = false

// Watch displayed days for scroll fix after prepend
watch(displayedDays, () => {
  if (pendingScrollFix) {
    nextTick(() => {
      const container = scrollContainer.value
      if (container && prevScrollHeight) {
        const newHeight = container.scrollHeight
        container.scrollTop += (newHeight - prevScrollHeight)
      }
      prevScrollHeight = 0
      pendingScrollFix = false
      loadingOlder.value = false
    })
  }
  if (loadingNewer.value) {
    nextTick(() => { loadingNewer.value = false })
  }
}, { flush: 'post' })

// IntersectionObservers
let topObserver: IntersectionObserver | null = null
let bottomObserver: IntersectionObserver | null = null

function loadOlder() {
  if (loadingOlder.value) return
  loadingOlder.value = true

  prevScrollHeight = scrollContainer.value?.scrollHeight ?? 0
  pendingScrollFix = true
  topOffset.value -= PAGE_SIZE
}

function loadNewer() {
  if (loadingNewer.value) return
  loadingNewer.value = true
  bottomOffset.value += PAGE_SIZE
}

function setupObservers() {
  const container = scrollContainer.value
  if (!container) return

  topObserver = new IntersectionObserver(
    (entries) => {
      if (!initialized.value) return
      for (const entry of entries) {
        if (entry.isIntersecting) loadOlder()
      }
    },
    { root: container, rootMargin: '400px 0px 0px 0px' }
  )

  bottomObserver = new IntersectionObserver(
    (entries) => {
      if (!initialized.value) return
      for (const entry of entries) {
        if (entry.isIntersecting) loadNewer()
      }
    },
    { root: container, rootMargin: '0px 0px 400px 0px' }
  )

  if (topSentinel.value) topObserver.observe(topSentinel.value)
  if (bottomSentinel.value) bottomObserver.observe(bottomSentinel.value)
}

function scrollToToday() {
  // First scroll to today instantly (no animation since we're about to reset DOM)
  if (todayEl.value) {
    todayEl.value.scrollIntoView({ block: 'start' })
  }

  // Then reset offsets to trim the DOM
  topOffset.value = -PAGE_SIZE
  bottomOffset.value = PAGE_SIZE

  // After DOM settles from the trim, ensure we're still at today
  nextTick(() => {
    nextTick(() => {
      if (todayEl.value) {
        todayEl.value.scrollIntoView({ block: 'start' })
      }
    })
  })
}

function doScrollToToday() {
  if (todayEl.value) {
    todayEl.value.scrollIntoView({ block: 'start' })
  }
}

// Re-subscribe when userId or date range changes
watch(userId, () => subscribe(), { immediate: true })
watch([startDate, endDate], () => subscribe())

onMounted(() => {
  // Scroll to today after initial data loads
  const stop = watch(displayedDays, () => {
    nextTick(() => {
      if (todayEl.value) {
        todayEl.value.scrollIntoView({ block: 'start' })
      }
      // Enable observers after initial scroll
      setTimeout(() => {
        initialized.value = true
        setupObservers()
      }, 300)
    })
    stop()
  })
})

onUnmounted(() => {
  subscription?.unsubscribe()
  topObserver?.disconnect()
  bottomObserver?.disconnect()
})

function openAddForm(_event?: Event, date?: string) {
  editingTodo.value = null
  selectedDate.value = date ?? todayStr
  showForm.value = true
}

function openEditForm(todo: Todo) {
  editingTodo.value = todo
  selectedDate.value = todo.dueDate ?? todayStr
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingTodo.value = null
}
</script>
