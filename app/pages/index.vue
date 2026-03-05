<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-20 pt-safe">
      <div class="flex items-center justify-between px-4 py-3">
        <div>
          <h1 class="text-2xl font-bold text-red-500">Today</h1>
          <p class="text-sm text-gray-500">{{ formattedDate }}</p>
        </div>
        <div class="flex items-center gap-2">
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
    <div class="flex-1 overflow-y-auto scroll-smooth-ios overscroll-none">
      <!-- Empty state -->
      <div v-if="filteredTodos.length === 0" class="mt-60">
        <EmptyState />
      </div>

      <!-- Todo list -->
      <div v-else>
        <TodoItem
          v-for="todo in filteredTodos"
          :key="todo.id"
          :todo="todo"
          @edit="openEditForm"
        />
      </div>
    </div>

    <!-- Add/Edit Form -->
    <TodoForm
      :is-open="showForm"
      :editing-todo="editingTodo"
      default-scope="day"
      :default-date="today"
      @close="closeForm"
    />
  </div>
</template>

<script setup lang="ts">
import { useObservable } from '@vueuse/rxjs'
import type { Todo } from '#shared/types'
import { today as getToday } from '~/utils/db'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { createTodosQuery } = useTodos()

const today = getToday()
const showSearch = ref(false)
const searchQuery = ref('')
const showForm = ref(false)
const editingTodo = ref<Todo | null>(null)

// Formatted date display
const formattedDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
})

// Live query for today's todos
const todosObservable = createTodosQuery(today)
const todos = useObservable(todosObservable, { initialValue: [] })

// Filtered todos based on search
const filteredTodos = computed(() => {
  if (!searchQuery.value.trim()) return todos.value
  
  const query = searchQuery.value.toLowerCase()
  return todos.value.filter(todo => 
    todo.title.toLowerCase().includes(query)
  )
})

function openAddForm() {
  editingTodo.value = null
  showForm.value = true
}

function openEditForm(todo: Todo) {
  editingTodo.value = todo
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingTodo.value = null
}
</script>
