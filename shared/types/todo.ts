/**
 * Todo scope determines where the todo appears
 */
export type TodoScope = "day" | "global";

/**
 * Sync status for offline-first operations
 */
export type SyncStatus = "pending" | "synced" | "conflict" | "deleted";

/**
 * Available todo colors
 */
export type TodoColor =
    | "red"
    | "orange"
    | "yellow"
    | "green"
    | "blue"
    | "purple"
    | "pink"
    | "gray";

/**
 * Rollover rules for uncompleted todos
 */
export type RolloverRule = "next-day" | "next-week" | "none";

/**
 * Core Todo model - normalized for IndexedDB storage
 */
export interface Todo {
    /** Unique identifier (UUID) */
    id: string;
    /** Todo title/description */
    title: string;
    /** Whether the todo is completed */
    completed: boolean;
    /** When the todo was completed (ISO string) */
    completedAt?: string;
    /** Todo scope: day or global */
    scope: TodoScope;
    /** Due date for day scoped todos (ISO date string YYYY-MM-DD) */
    dueDate?: string;
    /** Visual color indicator */
    color: TodoColor;
    /** How uncompleted todos should roll over */
    rolloverRule: RolloverRule;
    /** If this todo was rolled over, reference to original */
    rolloverFromId?: string;
    /** User who owns this todo */
    userId: string;
    /** Creation timestamp (ISO string) */
    createdAt: string;
    /** Last update timestamp (ISO string) */
    updatedAt: string;
    /** Sync status for offline operations */
    syncStatus: SyncStatus;
    /** Server version for conflict detection */
    version: number;
    /** Sort order within scope/date */
    sortOrder: number;
}

/**
 * Create todo input (client-side)
 */
export interface CreateTodoInput {
    title: string;
    scope: TodoScope;
    dueDate?: string;
    color?: TodoColor;
    rolloverRule?: RolloverRule;
}

/**
 * Update todo input (client-side)
 */
export interface UpdateTodoInput {
    id: string;
    title?: string;
    completed?: boolean;
    scope?: TodoScope;
    dueDate?: string;
    color?: TodoColor;
    rolloverRule?: RolloverRule;
    sortOrder?: number;
}

/**
 * User model from Auth0
 */
export interface User {
    id: string;
    email: string;
    name: string;
    picture?: string;
}

/**
 * Sync operation for queue
 */
export interface SyncOperation {
    id: string;
    type: "create" | "update" | "delete";
    todoId: string;
    data?: Partial<Todo>;
    timestamp: string;
    retryCount: number;
}

/**
 * App settings stored locally
 */
export interface AppSettings {
    /** User ID these settings belong to */
    userId: string;
    /** Enable daily reminder notifications */
    dailyReminderEnabled: boolean;
    /** Time for daily reminder (HH:mm format) */
    dailyReminderTime: string;
    /** Last sync timestamp */
    lastSyncAt?: string;
    /** Theme preference */
    theme: "light" | "dark" | "system";
}

/**
 * Color configuration
 */
export const TODO_COLORS: Record<
    TodoColor,
    { bg: string; text: string; border: string }
> = {
    red: {
        bg: "bg-todo-red",
        text: "text-todo-red",
        border: "border-todo-red",
    },
    orange: {
        bg: "bg-todo-orange",
        text: "text-todo-orange",
        border: "border-todo-orange",
    },
    yellow: {
        bg: "bg-todo-yellow",
        text: "text-todo-yellow",
        border: "border-todo-yellow",
    },
    green: {
        bg: "bg-todo-green",
        text: "text-todo-green",
        border: "border-todo-green",
    },
    blue: {
        bg: "bg-todo-blue",
        text: "text-todo-blue",
        border: "border-todo-blue",
    },
    purple: {
        bg: "bg-todo-purple",
        text: "text-todo-purple",
        border: "border-todo-purple",
    },
    pink: {
        bg: "bg-todo-pink",
        text: "text-todo-pink",
        border: "border-todo-pink",
    },
    gray: {
        bg: "bg-todo-gray",
        text: "text-todo-gray",
        border: "border-todo-gray",
    },
};

/**
 * Color hex values for inline styles
 */
export const TODO_COLOR_HEX: Record<TodoColor, string> = {
    red: "#FF3B30",
    orange: "#FF9500",
    yellow: "#FFCC00",
    green: "#34C759",
    blue: "#007AFF",
    purple: "#AF52DE",
    pink: "#FF2D55",
    gray: "#8E8E93",
};
