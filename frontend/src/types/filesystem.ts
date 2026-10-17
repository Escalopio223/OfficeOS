export interface FileNode {
    id: string
    user_id?: string
    name: string
    type?: 'folder' | 'file' | 'note' | 'oxplorer-node' | string
    is_directory: boolean
    size_bytes: number
    mime_type: string | null
    storage_type?: 'FILE' | 'VIRTUAL'
    storage_path?: string | null
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
    total?: number
    page: number
    totalPages?: number
    currentFolder?: FileNode | null
    nodes: FileNode[]
}

export interface SearchResponse {
    took_ms: string
    query: string
    count: number
    nodes: FileNode[]
}