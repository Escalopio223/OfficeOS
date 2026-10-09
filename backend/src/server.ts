import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Pool } from 'pg';

const app = Fastify({ logger: false });

app.register(cors, { origin: true });

// Pool de conexiones a Postgres (Docker puerto 5433)
const pool = new Pool({
    host: '127.0.0.1',
    port: 5433,
    user: 'oogle_user',
    password: 'oogle_pass',
    database: 'oogleos_db',
    max: 20,
});

// 1. Obtener contenidos de un directorio específico (paginado)
app.get('/api/nodes', async (request, reply) => {
    const { parentId, page = 1, limit = 50 } = request.query as {
        parentId?: string;
        page?: number;
        limit?: number;
    };

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const start = performance.now();

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

    return {
        took_ms: `${duration}ms`,
        count: rows.length,
        page: pageNum,
        nodes: rows,
    };
});

// 2. Búsqueda directa acelerada por el índice GiN
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
        await app.listen({ port: 3000, host: '0.0.0.0' });
        console.log('API Core corriendo en http://localhost:3000');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

startServer();