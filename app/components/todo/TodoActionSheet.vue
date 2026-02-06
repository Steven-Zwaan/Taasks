<template>
  <Teleport to="body">
    <Transition name="fade">
      <div class="modal-backdrop" @click="emit('close')" />
    </Transition>

    <Transition name="slide-up">
      <div class="modal-sheet animate-slide-up">
        <!-- Handle bar -->
        <div class="flex justify-center py-3">
          <div class="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div class="px-4 pb-4">
          <!-- Title preview -->
          <div class="text-center mb-4 pb-4 border-b border-gray-200">
            <p class="text-lg font-medium truncate">{{ todo.title }}</p>
            <p v-if="todo.dueDate" class="text-sm text-gray-500">{{ formatDate(todo.dueDate) }}</p>
          </div>

          <!-- Actions -->
          <div class="space-y-1">
            <!-- Toggle completion -->
            <button
              @click="handleToggle"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100"
            >
              <svg v-if="!todo.completed" class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <svg v-else class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>{{ todo.completed ? 'Mark as incomplete' : 'Mark as complete' }}</span>
            </button>

            <!-- Move to today -->
            <button
              v-if="todo.scope === 'global' || todo.dueDate !== today"
              @click="handleMoveToToday"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100"
            >
              <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Move to today</span>
            </button>

            <!-- Move to global -->
            <button
              v-if="todo.scope !== 'global'"
              @click="emit('move-to-global')"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100"
            >
              <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Move to inbox</span>
            </button>

            <!-- Change color -->
            <div class="px-4 py-3">
              <p class="text-sm text-gray-500 mb-2">Color</p>
              <div class="flex gap-2">
                <button
                  v-for="color in colors"
                  :key="color"
                  @click="emit('change-color', color)"
                  class="w-8 h-8 rounded-full border-2 transition-transform active:scale-90"
                  :class="todo.color === color ? 'border-gray-900 scale-110' : 'border-transparent'"
                  :style="{ backgroundColor: TODO_COLOR_HEX[color] }"
                />
              </div>
            </div>

            <!-- Edit -->
            <button
              @click="emit('edit')"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100"
            >
              <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit</span>
            </button>

            <!-- Delete -->
            <button
              @click="emit('delete')"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 active:bg-red-100 text-red-500"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete</span>
            </button>
          </div>

          <!-- Cancel -->
          <button
            @click="emit('close')"
            class="w-full mt-4 py-3 text-center text-red-500 font-medium bg-gray-100 rounded-xl"
          >
            Cancel
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Todo, TodoColor } from '#shared/types'
import { TODO_COLOR_HEX } from '#shared/types'
import { formatDate, today as getToday } from '~/utils/db'

const props = defineProps<{
  todo: Todo
}>()

const emit = defineEmits<{
  close: []
  edit: []
  delete: []
  'move-to-global': []
  'move-to-date': [date: string]
  'change-color': [color: TodoColor]
}>()

const { toggleTodo } = useTodos()

const today = getToday()
const colors: TodoColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray']

async function handleToggle() {
  await toggleTodo(props.todo.id)
  emit('close')
}

function handleMoveToToday() {
  emit('move-to-date', today)
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
