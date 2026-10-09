import { Client } from 'pg';

const client = new Client({
    host: '127.0.0.1',
    port: 5433,
    user: 'oogle_user',
    password: 'oogle_pass',
    database: 'oogleos_db',
});

async function runSeed() {
    await client.connect();
    console.log('Conectado a PostgreSQL en Docker.');
    console.time('Tiempo total de seeding');

    // Limpiar datos previos
    await client.query('TRUNCATE filesystem_nodes CASCADE');

    // 1. Nodo raíz (usando parámetros para evitar errores de comillas)
    const rootRes = await client.query(
        `INSERT INTO filesystem_nodes (name, is_directory, path)
     VALUES ($1, $2, $3::ltree)
     RETURNING id, path`,
        ['root', true, 'root']
    );

    const rootId = rootRes.rows[0].id;
    let totalInserted = 1;

    // 2. Carpetas base (Nivel 1)
    const baseFolders = ['Documents', 'System', 'Users', 'Applications', 'Media', 'Logs', 'Temp', 'Projects'];
    const folderPool: { id: string; path: string }[] = [];

    for (const name of baseFolders) {
        const safePath = `root.${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const res = await client.query(
            `INSERT INTO filesystem_nodes (name, is_directory, parent_id, path)
       VALUES ($1, true, $2, $3::ltree) RETURNING id, path`,
            [name, rootId, safePath]
        );
        folderPool.push({ id: res.rows[0].id, path: safePath });
        totalInserted++;
    }

    // 3. Subdirectorios para profundidad (Niveles 2 y 3)
    for (let i = 0; i < 300; i++) {
        const parent = folderPool[Math.floor(Math.random() * folderPool.length)];
        const folderName = `folder_${i}`;
        const safePath = `${parent.path}.${folderName}`;
        const res = await client.query(
            `INSERT INTO filesystem_nodes (name, is_directory, parent_id, path)
       VALUES ($1, true, $2, $3::ltree) RETURNING id, path`,
            [folderName, parent.id, safePath]
        );
        folderPool.push({ id: res.rows[0].id, path: safePath });
        totalInserted++;
    }

    // 4. Inserción masiva de archivos en chunks de 5.000
    const BATCH_SIZE = 5000;
    const TARGET_TOTAL = 100000;
    const extensions = ['txt', 'pdf', 'png', 'jpg', 'js', 'json', 'log', 'csv', 'mp4', 'sys', 'docx'];

    while (totalInserted < TARGET_TOTAL) {
        const batchCount = Math.min(BATCH_SIZE, TARGET_TOTAL - totalInserted);
        const values: any[] = [];
        const placeholders: string[] = [];

        for (let i = 0; i < batchCount; i++) {
            const parent = folderPool[Math.floor(Math.random() * folderPool.length)];
            const ext = extensions[Math.floor(Math.random() * extensions.length)];
            const fileIndex = totalInserted + i;
            const fileName = `doc_${fileIndex}.${ext}`;
            const ltreeNode = `node_${fileIndex}`;
            const nodePath = `${parent.path}.${ltreeNode}`;
            const sizeBytes = Math.floor(Math.random() * 8000000);
            const mime = `application/${ext}`;

            const offset = i * 5;
            placeholders.push(`($${offset + 1}, false, $${offset + 2}, $${offset + 3}::ltree, $${offset + 4}, $${offset + 5})`);
            values.push(fileName, parent.id, nodePath, sizeBytes, mime);
        }

        const query = `
      INSERT INTO filesystem_nodes (name, is_directory, parent_id, path, size_bytes, mime_type)
      VALUES ${placeholders.join(', ')}
    `;

        await client.query(query, values);
        totalInserted += batchCount;
        process.stdout.write(`\rInsertados: ${totalInserted} / ${TARGET_TOTAL} nodos`);
    }

    console.log('\n');
    console.timeEnd('Tiempo total de seeding');
    await client.end();
}

runSeed().catch(err => {
    console.error('\nFallo al ejecutar seeding:', err);
    process.exit(1);
});