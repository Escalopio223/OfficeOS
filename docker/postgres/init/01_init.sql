-- Extensiones requeridas para IDs, jerarquía ltree y búsqueda por trigramas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Tabla de nodos del explorador de archivos con soporte híbrido físico y virtual
CREATE TABLE IF NOT EXISTS filesystem_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    parent_id UUID REFERENCES filesystem_nodes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'file' CHECK (type IN ('folder', 'file')),
    is_directory BOOLEAN GENERATED ALWAYS AS (type = 'folder') STORED,
    mime_type VARCHAR(100),
    size_bytes BIGINT DEFAULT 0,
    storage_type VARCHAR(20) NOT NULL DEFAULT 'VIRTUAL' CHECK (storage_type IN ('FILE', 'VIRTUAL')),
    storage_path TEXT,
    path LTREE NOT NULL,
    pos_x INTEGER,
    pos_y INTEGER,
    content TEXT,
    password VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice compuesto obligatorio para optimizar consultas por árbol de directorios
CREATE INDEX IF NOT EXISTS idx_fs_user_parent_type_name ON filesystem_nodes (user_id, parent_id, type, name);

-- Índices jerárquicos y de búsqueda rápida para cumplir el criterio de <50ms en 100k registros
CREATE INDEX IF NOT EXISTS idx_fs_path_gist ON filesystem_nodes USING GIST (path);
CREATE INDEX IF NOT EXISTS idx_fs_path_btree ON filesystem_nodes USING BTREE (path);
CREATE INDEX IF NOT EXISTS idx_fs_parent_id ON filesystem_nodes (parent_id);
CREATE INDEX IF NOT EXISTS idx_fs_name_trgm ON filesystem_nodes USING GIN (name gin_trgm_ops);