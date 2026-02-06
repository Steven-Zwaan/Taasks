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
          <button class="p-2 rounded-full hover:bg-gray-100">
            <svg class="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 4h18v2H3V4zm0 7h12v2H3v-2zm0 7h18v2H3v-2z" />
            </svg>
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
    <div class="flex-1 overflow-y-auto scroll-smooth-ios overscroll-none pb-20">
      <!-- Empty state -->
      <div v-if="sortedDates.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400 px-8">
        <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p class="text-lg font-medium">No scheduled todos</p>
        <p class="text-sm mt-1">Tap + to schedule a todo</p>
      </div>

      <!-- Apple Calendar-style list view -->
      <div v-else>
        <template v-for="date in sortedDates" :key="date">
          <!-- Date header -->
          <div
            class="date-header"
            :class="{ 'text-red-500': isToday(date) }"
          >
            {{ formatDateHeader(date) }}
          </div>

          <!-- Todos for this date -->
          <TodoItem
            v-for="todo in filteredGroupedTodos.get(date)"
            :key="todo.id"
            :todo="todo"
            @edit="openEditForm"
          />
        </template>
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
import { useObservable } from '@vueuse/rxjs'
import type { Todo } from '#shared/types'
import { today as getToday, formatDate } from '~/utils/db'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { createGroupedTodosQuery } = useTodos()

const today = getToday()
const showSearch = ref(false)
const searchQuery = ref('')
const showForm = ref(false)
const editingTodo = ref<Todo | null>(null)
const selectedDate = ref(today)

// Live query for grouped todos
const groupedTodosObservable = createGroupedTodosQuery()
const groupedTodos = useObservable(groupedTodosObservable, { initialValue: new Map() })

// Filter todos based on search
const filteredGroupedTodos = computed(() => {
  if (!searchQuery.value.trim()) return groupedTodos.value

  const query = searchQuery.value.toLowerCase()
  const filtered = new Map<string, Todo[]>()

  for (const [date, todos] of groupedTodos.value) {
    const matchingTodos = todos.filter((todo: Todo) =>
      todo.title.toLowerCase().includes(query)
    )
    if (matchingTodos.length > 0) {
      filtered.set(date, matchingTodos)
    }
  }

  return filtered
})

// Sorted dates (chronological)
const sortedDates = computed(() => {
  return Array.from(filteredGroupedTodos.value.keys()).sort()
})

function isToday(date: string): boolean {
  return date === today
}

function formatDateHeader(date: string): string {
  return formatDate(date)
}

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
