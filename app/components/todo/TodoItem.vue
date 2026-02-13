<template>
  <div
    class="app-list-item group"
    :class="{ 'opacity-50': todo.completed }"
    @click="handleToggle"
  >
    <!-- Color indicator -->
    <div
      class="color-indicator h-10"
      :style="{ backgroundColor: colorHex }"
    />

    <!-- Checkbox (visual indicator, also toggles on tap) -->
    <div
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
    </div>

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

    <!-- Edit trigger (three-dot menu opens edit form) -->
    <button
      @click.stop="handleEdit"
      class="ml-2 p-1 group-hover:opacity-100 transition-opacity"
    >
      <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Todo } from '#shared/types'
import { TODO_COLOR_HEX } from '#shared/types'
import { formatDate } from '~/utils/db'

const props = defineProps<{
  todo: Todo
  showDate?: boolean
}>()

const emit = defineEmits<{
  edit: [todo: Todo]
}>()

const { toggleTodo } = useTodos()

const colorHex = computed(() => TODO_COLOR_HEX[props.todo.color])

async function handleToggle() {
  await toggleTodo(props.todo.id)
}

function handleEdit() {
  emit('edit', props.todo)
}
</script>
