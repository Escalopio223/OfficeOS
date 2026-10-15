export interface FileNode {
    id: string
    name: string
    is_directory: boolean
    size_bytes: number
    mime_type: string | null
    parent_id: string | null
    path: string
    pos_x?: number | null
    pos_y?: number | null
    content?: string | null
    is_protected?: boolean
    created_at?: string
    updated_at?: string
}

export interface NodesResponse {
    took_ms: string
    source?: string
    count: number
    page: number
    currentFolder?: FileNode | null
    nodes: FileNode[]
}

export interface SearchResponse {
    took_ms: string
    query: string
    count: number
    nodes: FileNode[]
}