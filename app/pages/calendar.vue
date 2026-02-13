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
    <div ref="scrollContainer" class="flex-1 overflow-y-auto scroll-smooth-ios overscroll-none pb-20" @scroll="onScroll">
      <!-- Loading older indicator -->
      <div v-if="loadingOlder" class="flex items-center justify-center py-3 text-gray-400">
        <svg class="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span class="text-sm">Loading earlier dates...</span>
      </div>

      <!-- Empty state -->
      <div v-if="allDates.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400 px-8">
        <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p class="text-lg font-medium">No scheduled todos</p>
        <p class="text-sm mt-1">Tap + to schedule a todo</p>
      </div>

      <!-- Apple Calendar-style list view -->
      <div v-else>
        <template v-for="date in allDates" :key="date">
          <!-- Date header -->
          <div
            :ref="el => { if (date === today) todayEl = el as HTMLElement }"
            class="date-header"
            :class="{ 'text-red-500': isToday(date) }"
          >
            {{ formatDateHeader(date) }}
          </div>

          <!-- Todos for this date -->
          <template v-if="filteredGroupedTodos.has(date)">
            <TodoItem
              v-for="todo in filteredGroupedTodos.get(date)"
              :key="todo.id"
              :todo="todo"
              @edit="openEditForm"
            />
          </template>

          <!-- Empty date placeholder -->
          <div v-else class="px-4 py-3 text-sm text-gray-300 italic">
            No todos
          </div>
        </template>
      </div>

      <!-- Loading newer indicator -->
      <div v-if="loadingNewer" class="flex items-center justify-center py-3 text-gray-400">
        <svg class="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span class="text-sm">Loading more dates...</span>
      </div>
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
import type { Subscription } from 'rxjs'
import type { Todo } from '#shared/types'
import { db, today as getToday, formatDate, addDays, generateDateRange } from '~/utils/db'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const PAGE_SIZE = 14
const MAX_RANGE_DAYS = 180 // cap to prevent unbounded DOM growth
const SCROLL_THRESHOLD = 200 // pixels from edge to trigger loading

const { user } = useAuth()
const userId = computed(() => user.value?.id ?? '')

const today = getToday()
const showSearch = ref(false)
const searchQuery = ref('')
const showForm = ref(false)
const editingTodo = ref<Todo | null>(null)
const selectedDate = ref(today)
const loadingOlder = ref(false)
const loadingNewer = ref(false)
const initialized = ref(false)

// Date range: start at today, future dates below, past dates loaded on scroll-up
const rangeStart = ref(today)
const rangeEnd = ref(addDays(today, PAGE_SIZE))

// Refs for scroll management
const scrollContainer = ref<HTMLElement | null>(null)
const todayEl = ref<HTMLElement | null>(null)

// Reactive grouped todos — manually managed subscription so we can
// re-subscribe when the date range changes (Dexie liveQuery doesn't
// react to Vue ref changes, only to IndexedDB data changes).
const groupedTodos = ref<Map<string, Todo[]>>(new Map())
let todosSubscription: Subscription | null = null

function subscribeTodos() {
  todosSubscription?.unsubscribe()
  const start = rangeStart.value
  const end = rangeEnd.value
  const uid = userId.value
  if (!uid) return

  const obs = liveQuery(async () => {
    const todos = await db.todos
      .where('[userId+dueDate]')
      .between([uid, start], [uid, end], true, true)
      .filter(todo => todo.syncStatus !== 'deleted' && todo.scope === 'day')
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

  todosSubscription = obs.subscribe({
    next: (val) => { groupedTodos.value = val },
    error: (err) => { console.error('Calendar query error:', err) },
  })
}

// Re-subscribe whenever range or user changes
watch([rangeStart, rangeEnd, userId], () => subscribeTodos(), { immediate: true })
onUnmounted(() => todosSubscription?.unsubscribe())

// Generate all dates in the visible range
const allDates = computed(() => {
  return generateDateRange(rangeStart.value, rangeEnd.value)
})

// Filter todos by search query
const filteredGroupedTodos = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const filtered = new Map<string, Todo[]>()

  for (const date of allDates.value) {
    const todos = groupedTodos.value.get(date)
    if (!todos || todos.length === 0) continue

    if (query) {
      const matchingTodos = todos.filter((todo: Todo) =>
        todo.title.toLowerCase().includes(query)
      )
      if (matchingTodos.length > 0) {
        filtered.set(date, matchingTodos)
      }
    } else {
      filtered.set(date, todos)
    }
  }

  return filtered
})

function isToday(date: string): boolean {
  return date === today
}

function formatDateHeader(date: string): string {
  return formatDate(date)
}

function scrollToToday() {
  // If today is outside the current range, reset to initial view
  if (today < rangeStart.value || today > rangeEnd.value) {
    rangeStart.value = today
    rangeEnd.value = addDays(today, PAGE_SIZE)
    nextTick(() => {
      if (scrollContainer.value) scrollContainer.value.scrollTop = 0
    })
    return
  }
  if (todayEl.value) {
    todayEl.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// Scroll event handler
function onScroll() {
  if (!initialized.value) return
  const container = scrollContainer.value
  if (!container) return

  // Near the top → load older dates
  if (container.scrollTop < SCROLL_THRESHOLD && !loadingOlder.value) {
    loadOlderDates()
  }

  // Near the bottom → load newer dates
  const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
  if (distanceFromBottom < SCROLL_THRESHOLD && !loadingNewer.value) {
    loadNewerDates()
  }
}

// Calculate days between two date strings
function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000
  return Math.round(
    (new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / msPerDay
  )
}

async function loadOlderDates() {
  // Cap: don't go more than MAX_RANGE_DAYS before today
  if (daysBetween(rangeStart.value, today) >= MAX_RANGE_DAYS) return

  loadingOlder.value = true

  const container = scrollContainer.value
  const previousHeight = container?.scrollHeight ?? 0

  rangeStart.value = addDays(rangeStart.value, -PAGE_SIZE)

  await nextTick()
  await nextTick()

  // Restore scroll position so content doesn't jump when prepending dates
  if (container) {
    const newHeight = container.scrollHeight
    container.scrollTop += (newHeight - previousHeight)
  }

  setTimeout(() => { loadingOlder.value = false }, 500)
}

async function loadNewerDates() {
  // Cap: don't go more than MAX_RANGE_DAYS after today
  if (daysBetween(today, rangeEnd.value) >= MAX_RANGE_DAYS) return

  loadingNewer.value = true
  rangeEnd.value = addDays(rangeEnd.value, PAGE_SIZE)
  await nextTick()
  setTimeout(() => { loadingNewer.value = false }, 500)
}

onMounted(() => {
  // Today is already at the top (rangeStart = today), so no scrollIntoView needed.
  // Just delay enabling pagination so the initial render at scrollTop=0 doesn't
  // immediately trigger loadOlderDates.
  nextTick(() => {
    setTimeout(() => { initialized.value = true }, 500)
  })
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
