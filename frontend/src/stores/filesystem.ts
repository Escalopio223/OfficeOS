import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { FileNode, NodesResponse, SearchResponse } from '@/types/filesystem'

// Evento global reactivo para sincronización inmediata entre Oxplorer y el Escritorio
export const filesystemEvent = ref(0)
export function notifyFilesystemChanged() {
    filesystemEvent.value++
}

export const useFileSystemStore = defineStore('filesystem', () => {
    const currentFolder = ref<FileNode | null>(null)
    const history = ref<FileNode[]>([])
    const nodes = ref<FileNode[]>([])
    const loading = ref<boolean>(false)
    const latency = ref<string>('0ms')
    const dataSource = ref<string>('N/A')

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

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
                await fetchFolderContents(first.id)
            }
        } finally {
            loading.value = false
        }
    }

    async function fetchFolderContents(parentId: string) {
        loading.value = true
        try {
            const res = await fetch(`/api/nodes?parentId=${parentId}&limit=100`)
            const data: NodesResponse = await res.json()
            nodes.value = data.nodes
            latency.value = data.took_ms
            dataSource.value = data.source || 'postgres'
            if (data.currentFolder) {
                currentFolder.value = data.currentFolder
            }
        } finally {
            loading.value = false
        }
    }

    async function navigateToPath(path: string) {
        loading.value = true
        try {
            const res = await fetch(`/api/nodes?parentPath=${encodeURIComponent(path)}&limit=100`)
            if (!res.ok) {
                return false
            }
            const data: NodesResponse = await res.json()
            nodes.value = data.nodes
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
        await fetchFolderContents(currentFolder.value.id)
    }

    async function openDirectory(folder: FileNode) {
        if (!folder.is_directory) return
        if (currentFolder.value) {
            history.value.push(currentFolder.value)
        }
        currentFolder.value = folder
        await fetchFolderContents(folder.id)
    }

    async function goBack() {
        const prev = history.value.pop()
        if (prev) {
            currentFolder.value = prev
            await fetchFolderContents(prev.id)
        }
    }

    async function createNode(params: {
        name: string
        is_directory?: boolean
        content?: string
        parentId?: string
        parentPath?: string
        pos_x?: number | null
        pos_y?: number | null
    }): Promise<FileNode | null> {
        try {
            const res = await fetch('/api/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            })
            if (!res.ok) return null
            const created: FileNode = await res.json()

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
            if (currentFolder.value) fetchFolderContents(currentFolder.value.id)
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
        latency,
        dataSource,
        initRoot,
        fetchFolderContents,
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
    }
})