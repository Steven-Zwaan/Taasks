<template>
  <template v-for="date in sortedDates" :key="date">
    <div
      :ref="el => { if (date === todayStr) todayRef = el as HTMLElement }"
      class="date-header"
      :class="{ 'text-red-500': date === todayStr }"
    >
      {{ formatDate(date) }}
    </div>

    <TodoItem
      v-for="todo in filteredTodos.get(date)"
      :key="todo.id"
      :todo="todo"
      @edit="emit('edit', $event)"
    />
  </template>
</template>

<script setup lang="ts">
import { liveQuery } from 'dexie'
import type { Todo } from '#shared/types'
import { db, today as getToday, formatDate } from '~/utils/db'

const props = defineProps<{
  startDate: string
  endDate: string
  searchQuery: string
}>()

const emit = defineEmits<{
  edit: [todo: Todo]
}>()

const { user } = useAuth()
const userId = computed(() => user.value?.id ?? '')

const todayStr = getToday()
const todayRef = ref<HTMLElement | null>(null)

const groupedTodos = ref<Map<string, Todo[]>>(new Map())
let subscription: { unsubscribe(): void } | null = null

function subscribe() {
  subscription?.unsubscribe()

  const start = props.startDate
  const end = props.endDate
  const uid = userId.value
  if (!uid) return

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
    error: (err) => { console.error('CalendarChunk query error:', err) },
  })
}

// Filter by search and remove empty dates
const filteredTodos = computed(() => {
  const query = props.searchQuery.trim().toLowerCase()
  const result = new Map<string, Todo[]>()

  for (const [date, todos] of groupedTodos.value) {
    if (query) {
      const matching = todos.filter(t => t.title.toLowerCase().includes(query))
      if (matching.length > 0) result.set(date, matching)
    } else {
      if (todos.length > 0) result.set(date, todos)
    }
  }
  return result
})

// Sorted date keys (oldest first)
const sortedDates = computed(() => {
  return [...filteredTodos.value.keys()].sort()
})

watch(userId, () => subscribe(), { immediate: true })
onUnmounted(() => subscription?.unsubscribe())

defineExpose({ todayRef })
</script>
