export interface FileNode {
    id: string
    name: string
    is_directory: boolean
    size_bytes: number
    mime_type: string | null
    parent_id: string | null
    path: string
}

export interface NodesResponse {
    took_ms: string
    source?: string
    count: number
    page: number
    nodes: FileNode[]
}

export interface SearchResponse {
    took_ms: string
    query: string
    count: number
    nodes: FileNode[]
}