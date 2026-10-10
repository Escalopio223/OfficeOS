import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FileNode, NodesResponse, SearchResponse } from '@/types/filesystem'

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

            if (data.nodes.length > 0) {
                currentFolder.value = data.nodes[0]
                await fetchFolderContents(data.nodes[0].id)
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
        } finally {
            loading.value = false
        }
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

    return {
        currentFolder,
        history,
        nodes,
        loading,
        latency,
        dataSource,
        initRoot,
        openDirectory,
        goBack,
        search
    }
})