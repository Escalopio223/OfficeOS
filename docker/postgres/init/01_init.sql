-- Extensiones requeridas para IDs, jerarquía ltree y búsqueda por trigramas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Tabla de nodos del explorador de archivos
CREATE TABLE IF NOT EXISTS filesystem_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    is_directory BOOLEAN NOT NULL DEFAULT FALSE,
    size_bytes BIGINT DEFAULT 0,
    mime_type VARCHAR(100),
    parent_id UUID REFERENCES filesystem_nodes(id) ON DELETE CASCADE,
    path LTREE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices obligatorios para cumplir el criterio de <50ms en 100k registros
CREATE INDEX IF NOT EXISTS idx_fs_path_gist ON filesystem_nodes USING GIST (path);
CREATE INDEX IF NOT EXISTS idx_fs_path_btree ON filesystem_nodes USING BTREE (path);
CREATE INDEX IF NOT EXISTS idx_fs_parent_id ON filesystem_nodes (parent_id);
CREATE INDEX IF NOT EXISTS idx_fs_name_trgm ON filesystem_nodes USING GIN (name gin_trgm_ops);