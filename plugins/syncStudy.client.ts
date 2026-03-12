// This plugin runs client-side only (.client.ts).
// It bootstraps the RemoteStorage connection (allowing auto-reconnect from a
// previously stored OAuth token) and subscribes to Pinia store mutations to
// trigger a debounced cloud upload whenever the user's data changes.

export default defineNuxtPlugin((nuxtApp) => {
    const { initRS, uploadData, syncState, autoSync } = useSync()

    // Initialise RemoteStorage early so it can silently restore an OAuth session
    // from localStorage before the user even visits the settings page.
    initRS()

    // Subscribe to store mutations only after the full app has mounted.
    // This avoids reacting to the initial rehydration from localStorage that
    // pinia-plugin-persistedstate performs via $patch on startup.
    nuxtApp.hook('app:mounted', () => {
        const store = useStudyStore()

        let debounceTimer: ReturnType<typeof setTimeout> | null = null

        store.$subscribe((_mutation, state) => {
            // Upload only when automatic sync is enabled and we are connected.
            // If either condition fails, localStorage remains the sole source of
            // truth and the upload is silently skipped.
            if (!autoSync.value || !syncState.isConnected) return

            if (debounceTimer) clearTimeout(debounceTimer)

            // 5-second debounce prevents burst uploads during rapid edits.
            debounceTimer = setTimeout(() => {
                uploadData({ sessions: state.sessions, goal: state.goal })
            }, 5_000)
        })
    })
})
