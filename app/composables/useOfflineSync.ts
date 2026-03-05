import type { Todo, SyncOperation, AppSettings } from "#shared/types";
import { db, generateId, now } from "~/utils/db";

type SyncState = "idle" | "syncing" | "offline" | "error" | "pending";

/**
 * Composable for offline-first sync operations
 * Uses timestamp-based conflict resolution - newest updatedAt wins
 */
export function useOfflineSync() {
    const { getAccessToken, user } = useAuth();

    // Reactive state
    const syncState = ref<SyncState>("idle");
    const lastSyncAt = ref<string | null>(null);
    const pendingCount = ref(0);
    const isOnline = ref(
        typeof navigator !== "undefined" ? navigator.onLine : true,
    );
    const lastSyncTime = ref<number>(0);
    const showTemporaryBanner = ref(false);
    const temporaryBannerState = ref<
        "syncing" | "offline" | "online" | "error" | null
    >(null);

    // Error handling state
    const hasShownErrorThisSession = ref(false);
    const syncErrorMessage = ref<string | null>(null);
    const lastErrorTime = ref<number>(0);

    // Minimum time between syncs (10 seconds - increased to reduce requests)
    const SYNC_COOLDOWN = 10000;
    // Visibility change cooldown (30 seconds - higher threshold for tab switching)
    const VISIBILITY_SYNC_COOLDOWN = 30000;
    // Retry interval when offline (1 minute)
    const OFFLINE_RETRY_INTERVAL = 60000;
    // Retry interval after error (3 minutes)
    const ERROR_RETRY_INTERVAL = 180000;

    let offlineRetryInterval: ReturnType<typeof setInterval> | null = null;
    let errorRetryInterval: ReturnType<typeof setInterval> | null = null;
    let syncInProgress = false;
    let pendingSyncRequest = false;

    // Initialize online status listeners and retry interval
    if (import.meta.client) {
        window.addEventListener("online", () => {
            isOnline.value = true;
            showTemporaryNotification("online");
            stopOfflineRetry();
            stopErrorRetry();
            // Clear session error flag on reconnect
            hasShownErrorThisSession.value = false;
            syncErrorMessage.value = null;
            syncImmediateThrottled();
        });

        window.addEventListener("offline", () => {
            isOnline.value = false;
            syncState.value = "offline";
            showTemporaryNotification("offline");
            startOfflineRetry();
        });

        // Sync on visibility change (app focus) - with higher cooldown
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible" && isOnline.value) {
                const timeSinceLastSync = Date.now() - lastSyncTime.value;
                // Use higher cooldown for visibility changes to prevent excessive requests
                if (
                    timeSinceLastSync > VISIBILITY_SYNC_COOLDOWN &&
                    !syncInProgress
                ) {
                    syncImmediateThrottled();
                }
            }
        });
    }

    /**
     * Throttled sync that prevents duplicate requests
     */
    function syncImmediateThrottled(): void {
        if (syncInProgress) {
            pendingSyncRequest = true;
            return;
        }
        syncImmediate();
    }

    /**
     * Start retry interval when offline
     */
    function startOfflineRetry(): void {
        if (offlineRetryInterval) return;

        offlineRetryInterval = setInterval(async () => {
            if (navigator.onLine) {
                isOnline.value = true;
                showTemporaryNotification("online");
                stopOfflineRetry();
                syncImmediate();
            } else {
                console.log("Attempting sync while offline...");
                await syncImmediate();
            }
        }, OFFLINE_RETRY_INTERVAL);
    }

    /**
     * Stop retry interval
     */
    function stopOfflineRetry(): void {
        if (offlineRetryInterval) {
            clearInterval(offlineRetryInterval);
            offlineRetryInterval = null;
        }
    }

    /**
     * Start error retry interval (every 3 minutes)
     */
    function startErrorRetry(): void {
        if (errorRetryInterval) return;

        errorRetryInterval = setInterval(async () => {
            console.log("Retrying sync after error...");
            await syncImmediate();
        }, ERROR_RETRY_INTERVAL);
    }

    /**
     * Stop error retry interval
     */
    function stopErrorRetry(): void {
        if (errorRetryInterval) {
            clearInterval(errorRetryInterval);
            errorRetryInterval = null;
        }
    }

    /**
     * Show temporary notification banner
     */
    function showTemporaryNotification(
        state: "syncing" | "offline" | "online" | "error",
    ): void {
        temporaryBannerState.value = state;
        showTemporaryBanner.value = true;

        setTimeout(() => {
            showTemporaryBanner.value = false;
            temporaryBannerState.value = null;
        }, 3000);
    }

    /**
     * Get pending sync operations count
     */
    async function updatePendingCount(): Promise<void> {
        pendingCount.value = await db.syncQueue.count();

        // Update sync state based on pending count
        if (
            pendingCount.value > 0 &&
            isOnline.value &&
            syncState.value === "idle"
        ) {
            syncState.value = "pending";
        } else if (pendingCount.value === 0 && syncState.value === "pending") {
            syncState.value = "idle";
        }
    }

    /**
     * Get last sync timestamp from settings
     */
    async function loadLastSyncAt(): Promise<void> {
        if (!user.value?.id) return;

        const settings = await db.settings.get(user.value.id);
        lastSyncAt.value = settings?.lastSyncAt ?? null;
    }

    /**
     * Save last sync timestamp
     */
    async function saveLastSyncAt(timestamp: string): Promise<void> {
        if (!user.value?.id) return;

        const existing = await db.settings.get(user.value.id);

        if (existing) {
            await db.settings.update(user.value.id, { lastSyncAt: timestamp });
        } else {
            await db.settings.add({
                userId: user.value.id,
                dailyReminderEnabled: false,
                dailyReminderTime: "09:00",
                lastSyncAt: timestamp,
                theme: "system",
            });
        }

        lastSyncAt.value = timestamp;
    }

    /**
     * Perform sync with server immediately (no debounce)
     * Uses timestamp-based conflict resolution - newest updatedAt wins
     */
    async function syncImmediate(): Promise<boolean> {
        // Prevent concurrent sync operations
        if (syncInProgress) {
            pendingSyncRequest = true;
            return false;
        }

        const token = await getAccessToken();
        if (!token || !user.value?.id) {
            syncState.value = isOnline.value ? "idle" : "offline";
            return false;
        }

        syncInProgress = true;
        pendingSyncRequest = false;
        syncState.value = "syncing";
        lastSyncTime.value = Date.now();
        showTemporaryNotification("syncing");

        try {
            await loadLastSyncAt();

            // Get local changes from sync queue
            const pendingOperations = await db.syncQueue.toArray();

            // Bulk-fetch all todos referenced by the queue in one call
            const todoIds = pendingOperations.map((op) => op.todoId);
            const localTodos = await db.todos.bulkGet(todoIds);
            const localChanges: Todo[] = localTodos.filter(
                (t): t is Todo => t !== undefined,
            );

            // Send sync request
            const response = await $fetch("/api/sync", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: {
                    lastSyncAt: lastSyncAt.value,
                    changes: localChanges,
                },
            });

            // Process server response
            const {
                serverChanges,
                conflicts = [],
                syncTimestamp,
            } = response as {
                serverChanges: Todo[];
                processedChanges: Todo[];
                conflicts: Todo[];
                syncTimestamp: string;
            };

            // Merge changes into local DB using timestamp comparison
            await db.transaction("rw", db.todos, db.syncQueue, async () => {
                // Bulk-fetch all local versions of server changes in one call
                const serverIds = serverChanges.map((t) => t.id);
                const existingLocals = await db.todos.bulkGet(serverIds);
                const localMap = new Map<string, Todo>();
                existingLocals.forEach((t, i) => {
                    if (t) localMap.set(serverIds[i]!, t);
                });

                // Process server changes (todos modified on server)
                for (const serverTodo of serverChanges) {
                    const localTodo = localMap.get(serverTodo.id);

                    if (!localTodo) {
                        // New todo from server
                        await db.todos.add(serverTodo);
                    } else {
                        // Timestamp-based resolution: newest updatedAt wins
                        const serverTime = new Date(
                            serverTodo.updatedAt,
                        ).getTime();
                        const localTime = new Date(
                            localTodo.updatedAt,
                        ).getTime();

                        if (serverTime > localTime) {
                            await db.todos.update(serverTodo.id, serverTodo);
                        }
                    }
                }

                // Process conflicts - server had newer data, update local
                for (const serverTodo of conflicts) {
                    await db.todos.update(serverTodo.id, serverTodo);
                }

                // Bulk-clear processed sync queue items
                const queueIds = pendingOperations.map((op) => op.id);
                await db.syncQueue.bulkDelete(queueIds);

                // Clean up soft-deleted todos inside the transaction
                await db.todos
                    .filter((todo) => todo.syncStatus === "deleted")
                    .delete();
            });

            // Save sync timestamp
            await saveLastSyncAt(syncTimestamp);
            await updatePendingCount();

            // Sync succeeded - we're online
            isOnline.value = true;
            stopOfflineRetry();

            // Set final state
            if (pendingCount.value > 0) {
                syncState.value = "pending";
            } else {
                syncState.value = "idle";
            }

            // Clear error state on successful sync
            syncErrorMessage.value = null;
            stopErrorRetry();

            syncInProgress = false;

            // Process any pending sync request that came in during sync
            if (pendingSyncRequest) {
                pendingSyncRequest = false;
                // Use setTimeout to prevent stack overflow
                setTimeout(() => syncImmediate(), 100);
            }

            return true;
        } catch (error) {
            console.error("Sync failed:", error);
            syncInProgress = false;

            // Check if it's a network error
            const isNetworkError =
                error instanceof TypeError ||
                (error as any)?.cause?.code === "ENOTFOUND" ||
                (error as any)?.message?.includes("fetch") ||
                (error as any)?.message?.includes("network");

            if (isNetworkError) {
                isOnline.value = false;
                syncState.value = "offline";
                startOfflineRetry();
            } else {
                // Show error only once per session
                if (!hasShownErrorThisSession.value) {
                    hasShownErrorThisSession.value = true;
                    syncErrorMessage.value = getErrorMessage(error);
                    showTemporaryNotification("error");
                }

                syncState.value = "error";
                lastErrorTime.value = Date.now();

                await incrementRetryCount();

                // Start retry interval for errors
                startErrorRetry();
            }

            return false;
        }
    }

    /**
     * Extract user-friendly error message from error
     */
    function getErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            if (
                error.message.includes("401") ||
                error.message.includes("Unauthorized")
            ) {
                return "Authentication expired. Please sign in again.";
            }
            if (error.message.includes("500")) {
                return "Server error. We'll retry automatically.";
            }
            if (error.message.includes("timeout")) {
                return "Request timed out. We'll retry automatically.";
            }
            return "Sync failed. We'll retry automatically.";
        }
        return "Sync failed. We'll retry automatically.";
    }

    /**
     * Dismiss the error banner
     */
    function dismissError(): void {
        syncErrorMessage.value = null;
    }

    /**
     * Debounced sync - for batching rapid changes (legacy compatibility)
     */
    let syncTimeout: ReturnType<typeof setTimeout> | null = null;

    async function sync(): Promise<boolean> {
        if (syncTimeout) {
            clearTimeout(syncTimeout);
        }

        return new Promise((resolve) => {
            syncTimeout = setTimeout(async () => {
                const result = await syncImmediate();
                resolve(result);
            }, 300); // Short debounce for batching
        });
    }

    /**
     * Increment retry count for failed operations
     */
    async function incrementRetryCount(): Promise<void> {
        const operations = await db.syncQueue.toArray();

        for (const op of operations) {
            if (op.retryCount >= 5) {
                // Max retries reached, remove from queue
                await db.syncQueue.delete(op.id);
            } else {
                await db.syncQueue.update(op.id, {
                    retryCount: op.retryCount + 1,
                });
            }
        }
    }

    /**
     * Force full sync (merge server todos with local)
     * Uses merge instead of delete-and-replace to prevent data loss across devices
     */
    async function fullSync(): Promise<boolean> {
        const token = await getAccessToken();
        if (!token || !user.value?.id) return false;

        syncState.value = "syncing";
        lastSyncTime.value = Date.now();
        showTemporaryNotification("syncing");

        try {
            // Fetch all todos from server
            const response = await $fetch("/api/todos", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const { todos, timestamp } = response as {
                todos: Todo[];
                timestamp: string;
            };

            await db.transaction("rw", db.todos, db.syncQueue, async () => {
                const serverMap = new Map(todos.map((t) => [t.id, t]));

                // Get all local todos for this user
                const localTodos = await db.todos
                    .where("userId")
                    .equals(user.value!.id)
                    .toArray();

                // Merge: for each local todo, keep whichever version is newer
                for (const local of localTodos) {
                    const server = serverMap.get(local.id);
                    if (server) {
                        const serverTime = new Date(server.updatedAt).getTime();
                        const localTime = new Date(local.updatedAt).getTime();
                        if (serverTime > localTime) {
                            await db.todos.update(local.id, server);
                        }
                        // If local is newer, keep it — will sync up on next incremental sync
                        serverMap.delete(local.id);
                    }
                    // Not on server and was already synced = deleted on another device
                    else if (local.syncStatus === "synced") {
                        await db.todos.delete(local.id);
                    }
                    // Not on server but pending sync = local-only, keep it
                }

                // Add todos that exist on server but not locally
                const newFromServer = [...serverMap.values()];
                if (newFromServer.length > 0) {
                    await db.todos.bulkAdd(newFromServer);
                }
            });

            // Don't clear sync queue — pending local changes still need to be pushed
            await saveLastSyncAt(timestamp);
            await updatePendingCount();

            isOnline.value = true;
            stopOfflineRetry();
            stopErrorRetry();
            syncState.value = pendingCount.value > 0 ? "pending" : "idle";
            syncErrorMessage.value = null;
            return true;
        } catch (error) {
            console.error("Full sync failed:", error);
            syncState.value = "error";

            // Show error only once per session
            if (!hasShownErrorThisSession.value) {
                hasShownErrorThisSession.value = true;
                syncErrorMessage.value = getErrorMessage(error);
                showTemporaryNotification("error");
            }

            startErrorRetry();
            return false;
        }
    }

    /**
     * Queue a sync operation - called from useTodos after each action
     */
    async function queueOperation(
        type: SyncOperation["type"],
        todoId: string,
        data?: Partial<Todo>,
    ): Promise<void> {
        // Always add to queue first
        await db.syncQueue.add({
            id: generateId(),
            type,
            todoId,
            data,
            timestamp: now(),
            retryCount: 0,
        });

        await updatePendingCount();

        // Sync immediately if online (use throttled to prevent too many requests)
        if (isOnline.value) {
            syncImmediateThrottled();
        }
        // If offline, the queue will be processed when we come back online
        // or by the retry interval
    }

    /**
     * Initialize sync on startup
     */
    async function initialize(): Promise<void> {
        await loadLastSyncAt();
        await updatePendingCount();

        // Always try to sync on startup
        await syncImmediate();

        // If we're offline, start the retry interval
        if (!isOnline.value) {
            startOfflineRetry();
        }
    }

    return {
        // State
        syncState,
        lastSyncAt,
        pendingCount,
        isOnline,
        showTemporaryBanner,
        temporaryBannerState,
        syncErrorMessage,
        hasShownErrorThisSession,

        // Actions
        sync,
        syncImmediate,
        fullSync,
        queueOperation,
        initialize,
        dismissError,
    };
}
