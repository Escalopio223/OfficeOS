import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { FileNode, NodesResponse, SearchResponse } from '@/types/filesystem'
import { useOmonitorStore } from '@/stores/omonitorStore'

// Evento global reactivo para sincronización inmediata entre Oxplorer y el Escritorio
export const filesystemEvent = ref(0)
export function notifyFilesystemChanged() {
    filesystemEvent.value++
}

export const useFileSystemStore = defineStore('filesystem', () => {
    const omonitor = useOmonitorStore()
    const currentFolder = ref<FileNode | null>(null)
    const history = ref<FileNode[]>([])
    const nodes = ref<FileNode[]>([])
    const loading = ref<boolean>(false)
    const loadingMore = ref<boolean>(false)
    const latency = ref<string>('0ms')
    const dataSource = ref<string>('N/A')
    const page = ref<number>(1)
    const total = ref<number>(0)
    const totalPages = ref<number>(1)
    const unlockedFolderIds = ref<Set<string>>(new Set())

    const hasMore = computed(() => page.value < totalPages.value)

    function isFolderUnlocked(folderId: string): boolean {
        return unlockedFolderIds.value.has(folderId)
    }

    function unlockFolder(folderId: string) {
        unlockedFolderIds.value.add(folderId)
    }

    function lockFolder(folderId: string) {
        unlockedFolderIds.value.delete(folderId)
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    function getFileRawUrl(id: string): string {
        return `/api/files/${id}/raw`
    }

    function getFileDownloadUrl(id: string): string {
        return `/api/files/${id}/download`
    }

    function downloadFile(node: { id: string; name: string }) {
        const link = document.createElement('a')
        link.href = getFileDownloadUrl(node.id)
        link.setAttribute('download', node.name)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    function notifyFileOpened(fileName: string) {
        omonitor.reportFileAction('opened', fileName);
    }

    async function initRoot() {
        loading.value = true
        try {
            const res = await fetch('/api/nodes')
            const data: NodesResponse = await res.json()
            latency.value = data.took_ms
            dataSource.value = data.source || 'postgres'

            const first = data.nodes[0]
            if (first) {
                currentFolder.value = first
                await fetchFolderContents(first.id, 1)
            }
        } finally {
            loading.value = false
        }
    }

    async function fetchFolderContents(parentId: string, targetPage = 1) {
        if (targetPage === 1) {
            loading.value = true
        } else {
            loadingMore.value = true
        }

        try {
            const res = await fetch(`/api/nodes?parentId=${parentId}&page=${targetPage}&limit=100`)
            const data: NodesResponse = await res.json()

            if (targetPage === 1) {
                nodes.value = data.nodes
            } else {
                // Evitar duplicados si se carga más
                const existingIds = new Set(nodes.value.map((n) => n.id))
                const newItems = data.nodes.filter((n) => !existingIds.has(n.id))
                nodes.value.push(...newItems)
            }

            page.value = data.page || targetPage
            total.value = data.total || data.count
            totalPages.value = data.totalPages || 1
            latency.value = data.took_ms
            dataSource.value = data.source || 'postgres'

            if (data.currentFolder) {
                currentFolder.value = data.currentFolder
            }
        } finally {
            loading.value = false
            loadingMore.value = false
        }
    }

    async function loadMoreFolderContents() {
        if (!currentFolder.value || !hasMore.value || loadingMore.value) return
        await fetchFolderContents(currentFolder.value.id, page.value + 1)
    }

    async function navigateToPath(path: string, targetPage = 1) {
        loading.value = true
        try {
            const res = await fetch(`/api/nodes?parentPath=${encodeURIComponent(path)}&page=${targetPage}&limit=100`)
            if (!res.ok) {
                return false
            }
            const data: NodesResponse = await res.json()
            nodes.value = data.nodes
            page.value = data.page || targetPage
            total.value = data.total || data.count
            totalPages.value = data.totalPages || 1
            latency.value = data.took_ms
            dataSource.value = data.source || 'postgres'
            if (data.currentFolder) {
                currentFolder.value = data.currentFolder
            }
            return true
        } catch {
            return false
        } finally {
            loading.value = false
        }
    }

    async function refreshCurrentFolder() {
        if (!currentFolder.value) return
        await fetchFolderContents(currentFolder.value.id, 1)
    }

    async function openDirectory(folder: FileNode) {
        if (!folder.is_directory) return
        if (currentFolder.value) {
            history.value.push(currentFolder.value)
        }
        currentFolder.value = folder
        await fetchFolderContents(folder.id, 1)
    }

    async function goBack() {
        const prev = history.value.pop()
        if (prev) {
            currentFolder.value = prev
            await fetchFolderContents(prev.id, 1)
        }
    }

    async function createNode(params: {
        name: string
        type?: 'folder' | 'file'
        is_directory?: boolean
        content?: string
        parentId?: string
        parentPath?: string
        pos_x?: number | null
        pos_y?: number | null
        password?: string
        storage_type?: 'FILE' | 'VIRTUAL'
        storage_path?: string | null
    }): Promise<FileNode | null> {
        try {
            const res = await fetch('/api/nodes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': omonitor.sessionId,
                },
                body: JSON.stringify(params),
            })
            if (!res.ok) return null
            const created: FileNode = await res.json()

            if (created.is_directory && params.password) {
                unlockFolder(created.id)
            }

            // Si se creó en la carpeta abierta en Oxplorer, refrescar lista
            if (
                (params.parentId && params.parentId === currentFolder.value?.id) ||
                (params.parentPath && params.parentPath === currentFolder.value?.path)
            ) {
                await refreshCurrentFolder()
            }

            notifyFilesystemChanged()
            return created
        } catch {
            return null
        }
    }

    async function moveNode(
        id: string,
        targetFolderId: string,
        pos_x: number | null = null,
        pos_y: number | null = null
    ): Promise<FileNode | null> {
        try {
            const res = await fetch(`/api/nodes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetFolderId,
                    pos_x,
                    pos_y,
                }),
            })
            if (!res.ok) return null
            const moved: FileNode = await res.json()

            await refreshCurrentFolder()
            notifyFilesystemChanged()
            return moved
        } catch {
            return null
        }
    }

    async function deleteNode(id: string): Promise<boolean> {
        try {
            const res = await fetch(`/api/nodes/${id}`, {
                method: 'DELETE',
                headers: {
                    'x-session-id': omonitor.sessionId,
                },
            })
            if (!res.ok) return false
            nodes.value = nodes.value.filter((n) => n.id !== id)
            notifyFilesystemChanged()
            return true
        } catch {
            return false
        }
    }

    async function renameNode(id: string, newName: string): Promise<FileNode | null> {
        try {
            const res = await fetch(`/api/nodes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName }),
            })
            if (!res.ok) return null
            const updated: FileNode = await res.json()
            const idx = nodes.value.findIndex((n) => n.id === id)
            if (idx !== -1) {
                nodes.value[idx] = updated
            }
            notifyFilesystemChanged()
            return updated
        } catch {
            return null
        }
    }

    async function updateContent(id: string, content: string): Promise<FileNode | null> {
        try {
            const res = await fetch(`/api/nodes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            })
            if (!res.ok) return null
            const updated: FileNode = await res.json()
            const idx = nodes.value.findIndex((n) => n.id === id)
            if (idx !== -1) {
                nodes.value[idx] = updated
            }
            notifyFilesystemChanged()
            return updated
        } catch {
            return null
        }
    }

    function search(query: string) {
        if (debounceTimer) clearTimeout(debounceTimer)

        if (!query.trim()) {
            if (currentFolder.value) fetchFolderContents(currentFolder.value.id, 1)
            return
        }

        debounceTimer = setTimeout(async () => {
            loading.value = true
            try {
                const res = await fetch(`/api/nodes/search?q=${encodeURIComponent(query)}&limit=50`)
                const data: SearchResponse = await res.json()
                nodes.value = data.nodes
                latency.value = data.took_ms
                dataSource.value = 'trigram-index'
            } finally {
                loading.value = false
            }
        }, 200)
    }

    async function verifyFolderPassword(folderId: string, password: string): Promise<boolean> {
        try {
            const res = await fetch(`/api/nodes/${folderId}/verify-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            })
            if (!res.ok) return false
            const data = await res.json()
            if (data.valid) {
                unlockFolder(folderId)
                return true
            }
            return false
        } catch {
            return false
        }
    }

    async function setFolderPassword(
        folderId: string,
        password: string,
        currentPassword?: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const res = await fetch(`/api/nodes/${folderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, currentPassword }),
            })
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                return { success: false, error: errData.error || 'Error al proteger la carpeta' }
            }
            const updated: FileNode = await res.json()
            unlockFolder(folderId)
            const idx = nodes.value.findIndex((n) => n.id === folderId)
            if (idx !== -1) {
                nodes.value[idx] = updated
            }
            notifyFilesystemChanged()
            return { success: true }
        } catch {
            return { success: false, error: 'Error de conexión' }
        }
    }

    async function removeFolderPassword(
        folderId: string,
        currentPassword: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const res = await fetch(`/api/nodes/${folderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: null, currentPassword }),
            })
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                return { success: false, error: errData.error || 'Error al quitar la protección' }
            }
            const updated: FileNode = await res.json()
            lockFolder(folderId)
            const idx = nodes.value.findIndex((n) => n.id === folderId)
            if (idx !== -1) {
                nodes.value[idx] = updated
            }
            notifyFilesystemChanged()
            return { success: true }
        } catch {
            return { success: false, error: 'Error de conexión' }
        }
    }

    // Sincronización en tiempo real: recarga la carpeta activa cuando haya cambios en el sistema de archivos
    watch(filesystemEvent, () => {
        if (currentFolder.value) {
            refreshCurrentFolder()
        }
    })

    return {
        currentFolder,
        history,
        nodes,
        loading,
        loadingMore,
        latency,
        dataSource,
        page,
        total,
        totalPages,
        hasMore,
        unlockedFolderIds,
        isFolderUnlocked,
        unlockFolder,
        lockFolder,
        verifyFolderPassword,
        setFolderPassword,
        removeFolderPassword,
        initRoot,
        fetchFolderContents,
        loadMoreFolderContents,
        navigateToPath,
        refreshCurrentFolder,
        openDirectory,
        goBack,
        createNode,
        moveNode,
        deleteNode,
        renameNode,
        updateContent,
        search,
        getFileRawUrl,
        getFileDownloadUrl,
        downloadFile,
        notifyFileOpened,
    }
})