<template>
  <div
    class="app-list-item group"
    :class="{ 'opacity-50': todo.completed }"
    @click="handleClick"
    @contextmenu.prevent="showActions = true"
  >
    <!-- Color indicator -->
    <div
      class="color-indicator h-10"
      :style="{ backgroundColor: colorHex }"
    />

    <!-- Checkbox -->
    <button
      @click.stop="handleToggle"
      class="todo-checkbox mr-3"
      :class="{ completed: todo.completed }"
      :style="!todo.completed ? { borderColor: colorHex } : {}"
    >
      <svg
        v-if="todo.completed"
        class="w-4 h-4 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="3"
          d="M5 13l4 4L19 7"
        />
      </svg>
    </button>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <p
        class="text-base truncate"
        :class="{ 'line-through text-gray-400': todo.completed }"
      >
        {{ todo.title }}
      </p>
      <p v-if="showDate && todo.dueDate" class="text-xs text-gray-400 mt-0.5">
        {{ formatDate(todo.dueDate) }}
      </p>
    </div>

    <!-- Actions trigger -->
    <button
      @click.stop="showActions = true"
      class="ml-2 p-1 group-hover:opacity-100 transition-opacity"
    >
      <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
      </svg>
    </button>

    <!-- Action Sheet -->
    <TodoActionSheet
      v-if="showActions"
      :todo="todo"
      @close="showActions = false"
      @edit="emit('edit', todo)"
      @delete="handleDelete"
      @move-to-global="handleMoveToGlobal"
      @move-to-date="handleMoveToDate"
      @change-color="handleChangeColor"
    />
  </div>
</template>

<script setup lang="ts">
import type { Todo, TodoColor } from '#shared/types'
import { TODO_COLOR_HEX } from '#shared/types'
import { formatDate } from '~/utils/db'

const props = defineProps<{
  todo: Todo
  showDate?: boolean
}>()

const emit = defineEmits<{
  edit: [todo: Todo]
  delete: [id: string]
  toggle: [id: string]
}>()

const { toggleTodo, deleteTodo, moveTodoToGlobal, moveTodoToDate, changeTodoColor } = useTodos()

const showActions = ref(false)

const colorHex = computed(() => TODO_COLOR_HEX[props.todo.color])

function handleClick() {
  emit('edit', props.todo)
}

async function handleToggle() {
  await toggleTodo(props.todo.id)
  emit('toggle', props.todo.id)
}

async function handleDelete() {
  await deleteTodo(props.todo.id)
  emit('delete', props.todo.id)
  showActions.value = false
}

async function handleMoveToGlobal() {
  await moveTodoToGlobal(props.todo.id)
  showActions.value = false
}

async function handleMoveToDate(date: string) {
  await moveTodoToDate(props.todo.id, date)
  showActions.value = false
}

async function handleChangeColor(color: TodoColor) {
  await changeTodoColor(props.todo.id, color)
  showActions.value = false
}
</script>
