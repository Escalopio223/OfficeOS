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

// 1. Obtener contenidos de un directorio con Cache-Aside
app.get('/api/nodes', async (request, reply) => {
    const { parentId, page = 1, limit = 50 } = request.query as {
        parentId?: string;
        page?: number;
        limit?: number;
    };

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Clave única por carpeta y página
    const cacheKey = `fs:dir:${parentId ?? 'root'}:p${pageNum}:l${limitNum}`;

    const start = performance.now();

    try {
        // 1. Intentar leer de Redis (Cache Hit)
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
    } catch (err) {
        // Si Redis falla, continuamos hacia Postgres sin romper la petición
    }

    // 2. Cache Miss: Consultar a PostgreSQL
    const query = parentId
        ? `
      SELECT id, name, is_directory, size_bytes, mime_type, parent_id, path
      FROM filesystem_nodes
      WHERE parent_id = $1
      ORDER BY is_directory DESC, name ASC
      LIMIT $2 OFFSET $3;
    `
        : `
      SELECT id, name, is_directory, size_bytes, mime_type, parent_id, path
      FROM filesystem_nodes
      WHERE parent_id IS NULL
      LIMIT 1;
    `;

    const params = parentId ? [parentId, limitNum, offset] : [];
    const { rows } = await pool.query(query, params);
    const duration = (performance.now() - start).toFixed(2);

    const payload = {
        source: 'postgres',
        took_ms: `${duration}ms`,
        count: rows.length,
        page: pageNum,
        nodes: rows,
    };

    // 3. Guardar en Redis en segundo plano con expiración
    redis.set(cacheKey, JSON.stringify(payload), 'EX', CACHE_TTL_SECONDS).catch(() => { });

    return payload;
});

// 2. Búsqueda difusa de alto rendimiento con trigramas
app.get('/api/nodes/search', async (request, reply) => {
    const { q, limit = 50 } = request.query as { q?: string; limit?: number };

    if (!q || q.trim().length === 0) {
        return reply.status(400).send({ error: 'Parámetro de búsqueda "q" requerido' });
    }

    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const start = performance.now();

    const query = `
    SELECT id, name, is_directory, size_bytes, mime_type, path
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