import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Pool } from 'pg';
import Redis from 'ioredis';

const app = Fastify({ logger: false });

app.register(cors, { origin: true });

// Pool de conexiones a PostgreSQL (Docker puerto 5433)
const pool = new Pool({
    host: '127.0.0.1',
    port: 5433,
    user: 'oogle_user',
    password: 'oogle_pass',
    database: 'oogleos_db',
    max: 20,
});

// Cliente de Redis (Docker puerto 6379)
const redis = new Redis({
    host: '127.0.0.1',
    port: 6379,
    lazyConnect: true,
});

redis.on('error', (err) => {
    console.error('Error de conexión con Redis:', err.message);
});

// TTL para la caché de directorios (60 segundos)
const CACHE_TTL_SECONDS = 60;

// Utilidad para invalidar caché de directorios
async function invalidateDirCache() {
    try {
        const keys = await redis.keys('fs:dir:*');
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } catch {
        // Ignorar fallos de redis al limpiar caché
    }
}

// Generador de slug válido para PostgreSQL ltree (alfanumérico y guiones bajos)
function sanitizeLtreeLabel(name: string): string {
    const clean = name.trim().replace(/[^a-zA-Z0-9_]/g, '_');
    const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const base = clean.slice(0, 30) || 'node';
    return `${base}_${unique}`;
}

// 1. Obtener contenidos de un directorio con Cache-Aside (por parentId o por parentPath)
app.get('/api/nodes', async (request, reply) => {
    const { parentId, parentPath, page = 1, limit = 50 } = request.query as {
        parentId?: string;
        parentPath?: string;
        page?: number;
        limit?: number;
    };

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Clave única por carpeta y página
    const cacheKey = `fs:dir:${parentPath ? `path_${parentPath}` : (parentId ?? 'root')}:p${pageNum}:l${limitNum}`;
    const start = performance.now();

    try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            const duration = (performance.now() - start).toFixed(2);
            const parsed = JSON.parse(cachedData);
            return {
                ...parsed,
                source: 'redis-cache',
                took_ms: `${duration}ms`,
            };
        }
    } catch {
        // Continuar hacia Postgres si Redis falla
    }

    let currentFolderNode: any = null;
    let query: string;
    let params: any[];

    if (parentPath) {
        const parentRes = await pool.query(
            'SELECT id, name, is_directory, size_bytes, mime_type, parent_id, path, pos_x, pos_y, content FROM filesystem_nodes WHERE path = $1::ltree LIMIT 1;',
            [parentPath]
        );
        if (parentRes.rows.length === 0) {
            return reply.status(404).send({ error: `Directorio con ruta ${parentPath} no encontrado` });
        }
        currentFolderNode = parentRes.rows[0];
        query = `
          SELECT id, name, is_directory, size_bytes, mime_type, parent_id, path, pos_x, pos_y, content
          FROM filesystem_nodes
          WHERE parent_id = $1
          ORDER BY is_directory DESC, name ASC
          LIMIT $2 OFFSET $3;
        `;
        params = [currentFolderNode.id, limitNum, offset];
    } else if (parentId) {
        const parentRes = await pool.query(
            'SELECT id, name, is_directory, size_bytes, mime_type, parent_id, path, pos_x, pos_y, content FROM filesystem_nodes WHERE id = $1 LIMIT 1;',
            [parentId]
        );
        if (parentRes.rows.length > 0) {
            currentFolderNode = parentRes.rows[0];
        }
        query = `
          SELECT id, name, is_directory, size_bytes, mime_type, parent_id, path, pos_x, pos_y, content
          FROM filesystem_nodes
          WHERE parent_id = $1
          ORDER BY is_directory DESC, name ASC
          LIMIT $2 OFFSET $3;
        `;
        params = [parentId, limitNum, offset];
    } else {
        query = `
          SELECT id, name, is_directory, size_bytes, mime_type, parent_id, path, pos_x, pos_y, content
          FROM filesystem_nodes
          WHERE parent_id IS NULL
          LIMIT 1;
        `;
        params = [];
    }

    const { rows } = await pool.query(query, params);
    if (!currentFolderNode && !parentId && !parentPath && rows.length > 0) {
        currentFolderNode = rows[0];
    }
    const duration = (performance.now() - start).toFixed(2);

    const payload = {
        source: 'postgres',
        took_ms: `${duration}ms`,
        count: rows.length,
        page: pageNum,
        currentFolder: currentFolderNode,
        nodes: rows,
    };

    redis.set(cacheKey, JSON.stringify(payload), 'EX', CACHE_TTL_SECONDS).catch(() => {});

    return payload;
});

// 2. Crear carpetas o archivos en cualquier parentPath o parentId
app.post('/api/nodes', async (request, reply) => {
    const {
        name,
        is_directory = false,
        parentPath,
        parentId,
        pos_x = null,
        pos_y = null,
        content = null,
        mime_type = null,
    } = request.body as {
        name?: string;
        is_directory?: boolean;
        parentPath?: string;
        parentId?: string;
        pos_x?: number | null;
        pos_y?: number | null;
        content?: string | null;
        mime_type?: string | null;
    };

    if (!name || !name.trim()) {
        return reply.status(400).send({ error: 'El nombre es obligatorio' });
    }

    let parentRow: { id: string; path: string; is_directory: boolean } | undefined;

    if (parentId) {
        const res = await pool.query('SELECT id, path, is_directory FROM filesystem_nodes WHERE id = $1', [parentId]);
        parentRow = res.rows[0];
    } else if (parentPath) {
        const res = await pool.query('SELECT id, path, is_directory FROM filesystem_nodes WHERE path = $1::ltree', [parentPath]);
        parentRow = res.rows[0];
    } else {
        const res = await pool.query('SELECT id, path, is_directory FROM filesystem_nodes WHERE parent_id IS NULL LIMIT 1');
        parentRow = res.rows[0];
    }

    if (!parentRow) {
        return reply.status(404).send({ error: 'Carpeta contenedora no encontrada' });
    }
    if (!parentRow.is_directory) {
        return reply.status(400).send({ error: 'El nodo padre debe ser una carpeta' });
    }

    const isDir = Boolean(is_directory);
    const label = sanitizeLtreeLabel(name);
    const newPath = `${parentRow.path}.${label}`;
    const contentStr = content ?? (isDir ? null : '');
    const sizeBytes = isDir ? 0 : Buffer.byteLength(contentStr || '', 'utf8');

    let finalMime = mime_type;
    if (!finalMime && !isDir) {
        const lower = name.toLowerCase();
        if (lower.endsWith('.txt')) finalMime = 'text/plain';
        else if (lower.endsWith('.csv')) finalMime = 'text/csv';
        else if (lower.endsWith('.json')) finalMime = 'application/json';
        else if (lower.endsWith('.md')) finalMime = 'text/markdown';
        else finalMime = 'application/octet-stream';
    }

    const query = `
      INSERT INTO filesystem_nodes (
        name, is_directory, parent_id, path, pos_x, pos_y, content, size_bytes, mime_type
      ) VALUES ($1, $2, $3, $4::ltree, $5, $6, $7, $8, $9)
      RETURNING id, name, is_directory, size_bytes, mime_type, parent_id, path, pos_x, pos_y, content, created_at, updated_at;
    `;

    const { rows } = await pool.query(query, [
        name.trim(),
        isDir,
        parentRow.id,
        newPath,
        pos_x,
        pos_y,
        contentStr,
        sizeBytes,
        finalMime,
    ]);

    await invalidateDirCache();

    return reply.status(201).send(rows[0]);
});

// 3. Mover nodo o actualizar coordenadas/contenido/nombre
app.patch('/api/nodes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const {
        pos_x,
        pos_y,
        targetFolderId,
        targetFolderPath,
        name,
        content,
    } = request.body as {
        pos_x?: number | null;
        pos_y?: number | null;
        targetFolderId?: string;
        targetFolderPath?: string;
        name?: string;
        content?: string | null;
    };

    const nodeRes = await pool.query(
        'SELECT id, name, is_directory, path, parent_id, pos_x, pos_y, content FROM filesystem_nodes WHERE id = $1',
        [id]
    );

    if (nodeRes.rows.length === 0) {
        return reply.status(404).send({ error: 'Nodo no encontrado' });
    }

    const existing = nodeRes.rows[0];

    // Protección para nodos raíz y escritorio
    if (existing.path === 'root' || existing.path === 'root.desktop') {
        if (targetFolderId || targetFolderPath) {
            return reply.status(403).send({ error: 'La raíz y la carpeta Escritorio no se pueden mover' });
        }
    }

    // Caso A: Mover a otra carpeta (actualizando en cascada los sub-árboles mediante ltree)
    if (targetFolderId || targetFolderPath) {
        let targetRow: { id: string; path: string; is_directory: boolean } | undefined;

        if (targetFolderId) {
            const res = await pool.query(
                'SELECT id, path, is_directory FROM filesystem_nodes WHERE id = $1',
                [targetFolderId]
            );
            targetRow = res.rows[0];
        } else {
            const res = await pool.query(
                'SELECT id, path, is_directory FROM filesystem_nodes WHERE path = $1::ltree',
                [targetFolderPath]
            );
            targetRow = res.rows[0];
        }

        if (!targetRow) {
            return reply.status(404).send({ error: 'Carpeta destino no encontrada' });
        }
        if (!targetRow.is_directory) {
            return reply.status(400).send({ error: 'El destino debe ser una carpeta' });
        }
        if (targetRow.id === existing.id) {
            return reply.status(400).send({ error: 'No se puede mover un elemento dentro de sí mismo' });
        }

        // Validar que el destino no sea un descendiente del nodo actual
        const descCheck = await pool.query(
            'SELECT 1 FROM filesystem_nodes WHERE id = $1 AND path <@ $2::ltree LIMIT 1',
            [targetRow.id, existing.path]
        );
        if (descCheck.rows.length > 0) {
            return reply.status(400).send({ error: 'No se puede mover una carpeta dentro de sus propios descendientes' });
        }

        const nodeLabel = existing.path.split('.').pop();
        const newPath = `${targetRow.path}.${nodeLabel}`;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Actualizar todos los descendientes en cascada si es carpeta
            if (existing.is_directory) {
                await client.query(
                    `UPDATE filesystem_nodes
                     SET path = $1::ltree || subpath(path, nlevel($2::ltree))
                     WHERE path <@ $2::ltree AND id != $3;`,
                    [newPath, existing.path, existing.id]
                );
            }

            const newPosX = pos_x !== undefined ? pos_x : null;
            const newPosY = pos_y !== undefined ? pos_y : null;

            const updateRes = await client.query(
                `UPDATE filesystem_nodes
                 SET parent_id = $1,
                     path = $2::ltree,
                     pos_x = $3,
                     pos_y = $4,
                     updated_at = NOW()
                 WHERE id = $5
                 RETURNING id, name, is_directory, size_bytes, mime_type, parent_id, path, pos_x, pos_y, content, created_at, updated_at;`,
                [targetRow.id, newPath, newPosX, newPosY, existing.id]
            );

            await client.query('COMMIT');
            await invalidateDirCache();

            return updateRes.rows[0];
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    // Caso B: Actualización sin cambio de carpeta (coordenadas, nombre, contenido)
    const hasPosX = pos_x !== undefined;
    const hasPosY = pos_y !== undefined;
    const newName = name && name.trim() ? name.trim() : null;
    const hasContent = content !== undefined;

    const updateQuery = `
      UPDATE filesystem_nodes
      SET
        pos_x = CASE WHEN $1::boolean THEN $2 ELSE pos_x END,
        pos_y = CASE WHEN $3::boolean THEN $4 ELSE pos_y END,
        name = COALESCE($5, name),
        content = CASE WHEN $6::boolean THEN $7 ELSE content END,
        size_bytes = CASE WHEN $6::boolean AND $7 IS NOT NULL THEN octet_length($7) ELSE size_bytes END,
        updated_at = NOW()
      WHERE id = $8
      RETURNING id, name, is_directory, size_bytes, mime_type, parent_id, path, pos_x, pos_y, content, created_at, updated_at;
    `;

    const { rows } = await pool.query(updateQuery, [
        hasPosX,
        pos_x ?? null,
        hasPosY,
        pos_y ?? null,
        newName,
        hasContent,
        content ?? null,
        id,
    ]);

    await invalidateDirCache();

    return rows[0];
});

// 4. Eliminar nodo y sus descendientes
app.delete('/api/nodes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const res = await pool.query('SELECT id, path FROM filesystem_nodes WHERE id = $1', [id]);
    if (res.rows.length === 0) {
        return reply.status(404).send({ error: 'Nodo no encontrado' });
    }

    const node = res.rows[0];
    if (node.path === 'root' || node.path === 'root.desktop') {
        return reply.status(403).send({ error: 'La raíz y la carpeta Escritorio no se pueden eliminar' });
    }

    await pool.query('DELETE FROM filesystem_nodes WHERE path <@ $1::ltree', [node.path]);
    await invalidateDirCache();

    return { success: true, deletedId: id };
});

// 5. Búsqueda difusa de alto rendimiento con trigramas
app.get('/api/nodes/search', async (request, reply) => {
    const { q, limit = 50 } = request.query as { q?: string; limit?: number };

    if (!q || q.trim().length === 0) {
        return reply.status(400).send({ error: 'Parámetro de búsqueda "q" requerido' });
    }

    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const start = performance.now();

    const query = `
    SELECT id, name, is_directory, size_bytes, mime_type, parent_id, path, pos_x, pos_y, content
    FROM filesystem_nodes
    WHERE name ILIKE '%' || $1 || '%'
    ORDER BY is_directory DESC, name ASC
    LIMIT $2;
  `;

    const { rows } = await pool.query(query, [q, limitNum]);
    const duration = (performance.now() - start).toFixed(2);

    return {
        took_ms: `${duration}ms`,
        query: q,
        count: rows.length,
        nodes: rows,
    };
});

// 6. Obtener imágenes de todo el sistema (con búsqueda opcional por nombre)
app.get('/api/nodes/images', async (request, reply) => {
    const { q, limit = 100 } = request.query as { q?: string; limit?: number };
    const limitNum = Math.min(200, Math.max(1, Number(limit)));
    const start = performance.now();

    const imageFilter = `(name ILIKE '%.jpg' OR name ILIKE '%.jpeg' OR name ILIKE '%.png' OR name ILIKE '%.webp' OR name ILIKE '%.svg' OR name ILIKE '%.gif')`;

    let query: string;
    let params: any[];

    if (q && q.trim().length > 0) {
        query = `
          SELECT id, name, is_directory, size_bytes, mime_type, parent_id, path, pos_x, pos_y, content
          FROM filesystem_nodes
          WHERE is_directory = false AND ${imageFilter} AND name ILIKE '%' || $1 || '%'
          ORDER BY name ASC
          LIMIT $2;
        `;
        params = [q.trim(), limitNum];
    } else {
        query = `
          SELECT id, name, is_directory, size_bytes, mime_type, parent_id, path, pos_x, pos_y, content
          FROM filesystem_nodes
          WHERE is_directory = false AND ${imageFilter}
          ORDER BY name ASC
          LIMIT $1;
        `;
        params = [limitNum];
    }

    const { rows } = await pool.query(query, params);
    const duration = (performance.now() - start).toFixed(2);

    return {
        took_ms: `${duration}ms`,
        query: q || '',
        count: rows.length,
        nodes: rows,
    };
});

const startServer = async () => {
    try {
        await redis.connect();
        console.log('Conectado a Redis.');
        await app.listen({ port: 3000, host: '0.0.0.0' });
        console.log('API Core corriendo en http://localhost:3000');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

startServer();