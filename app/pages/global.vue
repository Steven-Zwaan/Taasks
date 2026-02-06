<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-20 pt-safe">
      <div class="flex items-center justify-between px-4 py-3">
        <h1 class="text-2xl font-bold">Inbox</h1>
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
    <div class="flex-1 overflow-y-auto scroll-smooth-ios overscroll-none pb-20">
      <!-- Empty state -->
      <div v-if="filteredTodos.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400 px-8">
        <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p class="text-lg font-medium">Inbox is empty</p>
        <p class="text-sm mt-1 text-center">Add global todos here that don't have a specific date</p>
      </div>

      <!-- Todo list (no date headers, just a flat list) -->
      <div v-else>
        <TodoItem
          v-for="todo in filteredTodos"
          :key="todo.id"
          :todo="todo"
          :show-date="false"
          @edit="openEditForm"
        />
      </div>
    </div>

    <!-- Add/Edit Form -->
    <TodoForm
      :is-open="showForm"
      :editing-todo="editingTodo"
      default-scope="global"
      @close="closeForm"
    />
  </div>
</template>

<script setup lang="ts">
import { useObservable } from '@vueuse/rxjs'
import type { Todo } from '#shared/types'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { createGlobalTodosQuery } = useTodos()

const showSearch = ref(false)
const searchQuery = ref('')
const showForm = ref(false)
const editingTodo = ref<Todo | null>(null)

// Live query for global todos
const todosObservable = createGlobalTodosQuery()
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
