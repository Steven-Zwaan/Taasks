<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="modal-backdrop" @click="emit('close')" />
    </Transition>

    <Transition name="slide-up">
      <div v-if="isOpen" class="modal-sheet animate-slide-up">
        <!-- Handle bar -->
        <div class="flex justify-center py-3">
          <div class="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div class="px-4 pb-4">
          <h2 class="text-lg font-semibold mb-4">
            {{ editingTodo ? 'Edit Todo' : 'New Todo' }}
          </h2>

          <form @submit.prevent="handleSubmit">
            <!-- Title input -->
            <input
              ref="titleInput"
              v-model="title"
              type="text"
              placeholder="What needs to be done?"
              class="input-ios mb-4"
              required
            />

            <!-- Scope selector -->
            <div class="flex gap-2 mb-4">
              <button
                type="button"
                @click="scope = 'day'"
                class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                :class="scope === 'day' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700'"
              >
                Day
              </button>
              <button
                type="button"
                @click="scope = 'global'"
                class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                :class="scope === 'global' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700'"
              >
                Inbox
              </button>
            </div>

            <!-- Date picker (if day scope) -->
            <div v-if="scope === 'day'" class="mb-4">
              <label class="block text-sm text-gray-500 mb-1">Date</label>
              <input
                v-model="dueDate"
                type="date"
                class="input-ios"
                :min="today"
              />
            </div>

            <!-- Color picker -->
            <div class="mb-6">
              <label class="block text-sm text-gray-500 mb-2">Color</label>
              <div class="flex gap-2">
                <button
                  v-for="c in colors"
                  :key="c"
                  type="button"
                  @click="color = c"
                  class="w-8 h-8 rounded-full border-2 transition-transform active:scale-90"
                  :class="color === c ? 'border-gray-900 scale-110' : 'border-transparent'"
                  :style="{ backgroundColor: TODO_COLOR_HEX[c] }"
                />
              </div>
            </div>

            <!-- Submit button -->
            <button
              type="submit"
              :disabled="!title.trim()"
              class="w-full bg-red-500 text-white font-medium py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed active:bg-red-600 transition-colors"
            >
              {{ editingTodo ? 'Save Changes' : 'Add Todo' }}
            </button>
          </form>

          <!-- Cancel -->
          <button
            @click="emit('close')"
            class="w-full mt-2 py-3 text-center text-gray-500 font-medium"
          >
            Cancel
          </button>

          <!-- Delete (edit mode only) -->
          <button
            v-if="editingTodo"
            @click="handleDelete"
            class="w-full mt-2 py-3 text-center text-red-500 font-medium border border-red-200 rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors"
          >
            {{ confirmingDelete ? 'Tap again to delete' : 'Delete Todo' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Todo, TodoScope, TodoColor } from '#shared/types'
import { TODO_COLOR_HEX } from '#shared/types'
import { today as getToday } from '~/utils/db'

const props = defineProps<{
  isOpen: boolean
  editingTodo?: Todo | null
  defaultScope?: TodoScope
  defaultDate?: string
}>()

const emit = defineEmits<{
  close: []
  submit: [data: { title: string; scope: TodoScope; dueDate?: string; color: TodoColor }]
}>()

const { createTodo, updateTodo, deleteTodo } = useTodos()

const titleInput = ref<HTMLInputElement>()
const title = ref('')
const scope = ref<TodoScope>('day')
const dueDate = ref('')
const color = ref<TodoColor>('blue')
const confirmingDelete = ref(false)

const today = getToday()
const colors: TodoColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray']

// Reset form when opening
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    confirmingDelete.value = false
    if (props.editingTodo) {
      title.value = props.editingTodo.title
      scope.value = props.editingTodo.scope
      dueDate.value = props.editingTodo.dueDate ?? today
      color.value = props.editingTodo.color
    } else {
      title.value = ''
      scope.value = props.defaultScope ?? 'day'
      dueDate.value = props.defaultDate ?? today
      color.value = 'blue'
    }
    // Focus input after transition
    nextTick(() => {
      setTimeout(() => titleInput.value?.focus(), 300)
    })
  }
})

async function handleSubmit() {
  if (!title.value.trim()) return

  if (props.editingTodo) {
    await updateTodo({
      id: props.editingTodo.id,
      title: title.value.trim(),
      scope: scope.value,
      dueDate: scope.value === 'day' ? dueDate.value : undefined,
      color: color.value,
    })
  } else {
    await createTodo({
      title: title.value.trim(),
      scope: scope.value,
      dueDate: scope.value === 'day' ? dueDate.value : undefined,
      color: color.value,
    })
  }

  emit('close')
}

async function handleDelete() {
  if (!props.editingTodo) return

  if (!confirmingDelete.value) {
    confirmingDelete.value = true
    // Reset after 3 seconds if not confirmed
    setTimeout(() => {
      confirmingDelete.value = false
    }, 3000)
    return
  }

  await deleteTodo(props.editingTodo.id)
  emit('close')
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
