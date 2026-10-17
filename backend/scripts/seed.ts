import { Client } from 'pg';
import path from 'path';
import { ensure150PhysicalImages } from '../src/utils/imageGenerator';

const client = new Client({
  host: '127.0.0.1',
  port: 5433,
  user: 'oogle_user',
  password: 'oogle_pass',
  database: 'oogleos_db',
});

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';
const TARGET_TOTAL = 100000;

interface NodeInfo {
  id: string;
  path: string;
  name: string;
}

async function runSeed() {
  await client.connect();
  console.log('==> Conectado a PostgreSQL.');
  console.time('Tiempo total de seeding');

  // 1. Asegurar esquema nuevo en PostgreSQL
  console.log('==> Verificando y actualizando esquema de tabla...');
  await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
  await client.query(`CREATE EXTENSION IF NOT EXISTS "ltree";`);
  await client.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm";`);

  // Si la tabla antigua tiene columnas diferentes, recrearla limpiamente
  await client.query(`DROP TABLE IF EXISTS filesystem_nodes CASCADE;`);

  await client.query(`
    CREATE TABLE filesystem_nodes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL DEFAULT '${DEFAULT_USER_ID}'::uuid,
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

    CREATE INDEX idx_fs_user_parent_type_name ON filesystem_nodes (user_id, parent_id, type, name);
    CREATE INDEX idx_fs_path_gist ON filesystem_nodes USING GIST (path);
    CREATE INDEX idx_fs_path_btree ON filesystem_nodes USING BTREE (path);
    CREATE INDEX idx_fs_parent_id ON filesystem_nodes (parent_id);
    CREATE INDEX idx_fs_name_trgm ON filesystem_nodes USING GIN (name gin_trgm_ops);
  `);

  console.log('==> Tabla filesystem_nodes inicializada con el nuevo esquema e índices.');

  // 2. Aprovisionar exactamente 150 imágenes físicas en disco
  const storageDir = path.resolve(__dirname, '../storage/images');
  console.log(`==> Aprovisionando 150 imágenes físicas reales en: ${storageDir}`);
  const physicalImageFiles = await ensure150PhysicalImages(storageDir);
  console.log(`==> ${physicalImageFiles.length} imágenes físicas preparadas en disco.`);

  let totalInserted = 0;

  // 3. Crear nodo raíz
  const rootRes = await client.query(
    `INSERT INTO filesystem_nodes (user_id, name, type, path)
     VALUES ($1, 'root', 'folder', 'root'::ltree)
     RETURNING id, path, name`,
    [DEFAULT_USER_ID]
  );
  const rootNode: NodeInfo = rootRes.rows[0];
  totalInserted++;

  // 4. Jerarquía raíz obligatoria (7 carpetas principales)
  const rootDirs = [
    { name: 'Escritorio', ltree: 'desktop' },
    { name: 'Imagenes', ltree: 'Imagenes' },
    { name: 'Facturas_CSV', ltree: 'Facturas_CSV' },
    { name: 'Textos', ltree: 'Textos' },
    { name: 'Codigo', ltree: 'Codigo' },
    { name: 'Documentos_PDF', ltree: 'Documentos_PDF' },
    { name: 'Dibujos_Paint', ltree: 'Dibujos_Paint' },
  ];

  const rootFolderMap: Record<string, NodeInfo> = {};

  for (const rd of rootDirs) {
    const res = await client.query(
      `INSERT INTO filesystem_nodes (user_id, parent_id, name, type, path)
       VALUES ($1, $2, $3, 'folder', $4::ltree)
       RETURNING id, path, name`,
      [DEFAULT_USER_ID, rootNode.id, rd.name, `root.${rd.ltree}`]
    );
    rootFolderMap[rd.name] = res.rows[0];
    totalInserted++;
  }

  console.log('==> Jerarquía raíz creada.');

  // 5. Poblar /Escritorio (manteniéndolo limpio, con accesos de muestra)
  const desktopNode = rootFolderMap['Escritorio'];
  const sampleDesktopFiles = [
    { name: 'Bienvenido.txt', pos_x: 24, pos_y: 24, mime: 'text/plain', size: 1420 },
    { name: 'Instrucciones_OogleOS.md', pos_x: 24, pos_y: 114, mime: 'text/markdown', size: 2840 },
    { name: 'Notas_Rapidas.txt', pos_x: 24, pos_y: 204, mime: 'text/plain', size: 850 },
    { name: 'Resumen_Facturacion_2026.csv', pos_x: 118, pos_y: 24, mime: 'text/csv', size: 4520 },
    { name: 'Guia_Desarrollo.pdf', pos_x: 118, pos_y: 114, mime: 'application/pdf', size: 12400 },
  ];

  for (const f of sampleDesktopFiles) {
    const ltreeLabel = `desk_${totalInserted}`;
    await client.query(
      `INSERT INTO filesystem_nodes (user_id, parent_id, name, type, path, mime_type, size_bytes, storage_type, pos_x, pos_y)
       VALUES ($1, $2, $3, 'file', $4::ltree, $5, $6, 'VIRTUAL', $7, $8)`,
      [DEFAULT_USER_ID, desktopNode.id, f.name, `${desktopNode.path}.${ltreeLabel}`, f.mime, f.size, f.pos_x, f.pos_y]
    );
    totalInserted++;
  }

  // 6. Poblar /Imagenes: Años (2024, 2025, 2026) -> Meses (Enero - Diciembre) con 150 imágenes físicas
  const imagenesNode = rootFolderMap['Imagenes'];
  const years = ['2024', '2025', '2026'];
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const monthFolders: NodeInfo[] = [];

  for (const yr of years) {
    const yrRes = await client.query(
      `INSERT INTO filesystem_nodes (user_id, parent_id, name, type, path)
       VALUES ($1, $2, $3, 'folder', $4::ltree)
       RETURNING id, path, name`,
      [DEFAULT_USER_ID, imagenesNode.id, yr, `${imagenesNode.path}.yr_${yr}`]
    );
    totalInserted++;
    const yrNode: NodeInfo = yrRes.rows[0];

    for (let mIdx = 0; mIdx < months.length; mIdx++) {
      const monthName = months[mIdx];
      const mRes = await client.query(
        `INSERT INTO filesystem_nodes (user_id, parent_id, name, type, path)
         VALUES ($1, $2, $3, 'folder', $4::ltree)
         RETURNING id, path, name`,
        [DEFAULT_USER_ID, yrNode.id, monthName, `${yrNode.path}.m_${mIdx + 1}`]
      );
      totalInserted++;
      monthFolders.push(mRes.rows[0]);
    }
  }

  // Distribuir exactamente las 150 imágenes físicas entre las carpetas de mes
  let imgIndex = 0;
  for (const imgName of physicalImageFiles) {
    const parent = monthFolders[imgIndex % monthFolders.length];
    const ext = imgName.split('.').pop()?.toLowerCase() || 'png';
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
    const ltreeLabel = `img_${imgIndex + 1}`;

    await client.query(
      `INSERT INTO filesystem_nodes (user_id, parent_id, name, type, path, mime_type, size_bytes, storage_type, storage_path)
       VALUES ($1, $2, $3, 'file', $4::ltree, $5, $6, 'FILE', $7)`,
      [DEFAULT_USER_ID, parent.id, imgName, `${parent.path}.${ltreeLabel}`, mime, 250000 + (imgIndex * 1337) % 50000, `images/${imgName}`]
    );
    totalInserted++;
    imgIndex++;
  }
  console.log(`==> 150 imágenes físicas repartidas en /Imagenes por años y meses.`);

  // 7. Poblar /Facturas_CSV: Años (2024, 2025, 2026) -> Trimestres (T1, T2, T3, T4) con 500 archivos CSV
  const facturasNode = rootFolderMap['Facturas_CSV'];
  const quarters = ['T1', 'T2', 'T3', 'T4'];
  const quarterFolders: NodeInfo[] = [];

  for (const yr of years) {
    const yrRes = await client.query(
      `INSERT INTO filesystem_nodes (user_id, parent_id, name, type, path)
       VALUES ($1, $2, $3, 'folder', $4::ltree)
       RETURNING id, path, name`,
      [DEFAULT_USER_ID, facturasNode.id, yr, `${facturasNode.path}.yr_${yr}`]
    );
    totalInserted++;
    const yrNode: NodeInfo = yrRes.rows[0];

    for (const q of quarters) {
      const qRes = await client.query(
        `INSERT INTO filesystem_nodes (user_id, parent_id, name, type, path)
         VALUES ($1, $2, $3, 'folder', $4::ltree)
         RETURNING id, path, name`,
        [DEFAULT_USER_ID, yrNode.id, q, `${yrNode.path}.${q}`]
      );
      totalInserted++;
      quarterFolders.push(qRes.rows[0]);
    }
  }

  // Insertar exactamente 500 CSVs virtuales de facturas
  for (let i = 1; i <= 500; i++) {
    const parent = quarterFolders[(i - 1) % quarterFolders.length];
    const fileName = `Factura_Oogle_${String(i).padStart(4, '0')}.csv`;
    const ltreeLabel = `fac_${i}`;
    const simulatedSize = 3200 + ((i * 47) % 800);

    await client.query(
      `INSERT INTO filesystem_nodes (user_id, parent_id, name, type, path, mime_type, size_bytes, storage_type)
       VALUES ($1, $2, $3, 'file', $4::ltree, 'text/csv', $5, 'VIRTUAL')`,
      [DEFAULT_USER_ID, parent.id, fileName, `${parent.path}.${ltreeLabel}`, simulatedSize]
    );
    totalInserted++;
  }
  console.log(`==> 500 facturas CSV virtuales creadas en /Facturas_CSV.`);

  // 8. Crear subcarpetas estructuradas para las demás categorías
  const textSub = ['Notas', 'Borradores', 'Logs'];
  const textFolders: NodeInfo[] = [];
  for (const s of textSub) {
    const res = await client.query(
      `INSERT INTO filesystem_nodes (user_id, parent_id, name, type, path)
       VALUES ($1, $2, $3, 'folder', $4::ltree)
       RETURNING id, path, name`,
      [DEFAULT_USER_ID, rootFolderMap['Textos'].id, s, `${rootFolderMap['Textos'].path}.${s}`]
    );
    totalInserted++;
    textFolders.push(res.rows[0]);
  }

  const pdfSub = ['Contratos', 'Manuales', 'Informes'];
  const pdfFolders: NodeInfo[] = [];
  for (const s of pdfSub) {
    const res = await client.query(
      `INSERT INTO filesystem_nodes (user_id, parent_id, name, type, path)
       VALUES ($1, $2, $3, 'folder', $4::ltree)
       RETURNING id, path, name`,
      [DEFAULT_USER_ID, rootFolderMap['Documentos_PDF'].id, s, `${rootFolderMap['Documentos_PDF'].path}.${s}`]
    );
    totalInserted++;
    pdfFolders.push(res.rows[0]);
  }

  const paintSub = ['Bocetos', 'Sprites', 'Lienzos'];
  const paintFolders: NodeInfo[] = [];
  for (const s of paintSub) {
    const res = await client.query(
      `INSERT INTO filesystem_nodes (user_id, parent_id, name, type, path)
       VALUES ($1, $2, $3, 'folder', $4::ltree)
       RETURNING id, path, name`,
      [DEFAULT_USER_ID, rootFolderMap['Dibujos_Paint'].id, s, `${rootFolderMap['Dibujos_Paint'].path}.${s}`]
    );
    totalInserted++;
    paintFolders.push(res.rows[0]);
  }

  // /Codigo -> Proyecto_Alpha, Scripts, Configs y emulación de estructura node_modules
  const codeNode = rootFolderMap['Codigo'];
  const codeSub = ['Proyecto_Alpha', 'Scripts', 'Configs'];
  const codeFolders: NodeInfo[] = [];
  for (const s of codeSub) {
    const res = await client.query(
      `INSERT INTO filesystem_nodes (user_id, parent_id, name, type, path)
       VALUES ($1, $2, $3, 'folder', $4::ltree)
       RETURNING id, path, name`,
      [DEFAULT_USER_ID, codeNode.id, s, `${codeNode.path}.${s}`]
    );
    totalInserted++;
    codeFolders.push(res.rows[0]);
  }

  // Crear jerarquía realista de paquetes node_modules dentro de Proyecto_Alpha
  const alphaFolder = codeFolders[0];
  const nodeModulesRes = await client.query(
    `INSERT INTO filesystem_nodes (user_id, parent_id, name, type, path)
     VALUES ($1, $2, 'node_modules', 'folder', $3::ltree)
     RETURNING id, path, name`,
    [DEFAULT_USER_ID, alphaFolder.id, `${alphaFolder.path}.node_modules`]
  );
  totalInserted++;
  const nodeModulesFolder: NodeInfo = nodeModulesRes.rows[0];

  const packageNames = [
    'vue', 'fastify', 'ioredis', 'pg', 'typescript', 'vite', 'pinia',
    'eslint', 'prettier', 'vitest', 'zod', 'dotenv', 'axios', 'rxjs',
    'lodash', 'chalk', 'commander', 'express', 'postcss', 'tailwindcss'
  ];

  const codeFolderPool: NodeInfo[] = [...codeFolders, nodeModulesFolder];

  for (const pkg of packageNames) {
    const pkgRes = await client.query(
      `INSERT INTO filesystem_nodes (user_id, parent_id, name, type, path)
       VALUES ($1, $2, $3, 'folder', $4::ltree)
       RETURNING id, path, name`,
      [DEFAULT_USER_ID, nodeModulesFolder.id, pkg, `${nodeModulesFolder.path}.pkg_${pkg.replace(/[^a-zA-Z0-9]/g, '_')}`]
    );
    totalInserted++;
    const pkgNode: NodeInfo = pkgRes.rows[0];
    codeFolderPool.push(pkgNode);

    // Subcarpetas src, lib, dist
    for (const sub of ['src', 'lib', 'dist']) {
      const subRes = await client.query(
        `INSERT INTO filesystem_nodes (user_id, parent_id, name, type, path)
         VALUES ($1, $2, $3, 'folder', $4::ltree)
         RETURNING id, path, name`,
        [DEFAULT_USER_ID, pkgNode.id, sub, `${pkgNode.path}.${sub}`]
      );
      totalInserted++;
      codeFolderPool.push(subRes.rows[0]);
    }
  }

  console.log(`==> Jerarquía de carpetas de código creada (${codeFolderPool.length} carpetas disponibles).`);

  // 9. Completar el remanente masivo hasta exactamente 100.000 nodos
  const remainingNeeded = TARGET_TOTAL - totalInserted;
  console.log(`==> Nodos insertados hasta ahora: ${totalInserted}. Faltan ${remainingNeeded} para alcanzar los ${TARGET_TOTAL}.`);

  const BATCH_SIZE = 4000;
  const mimeMap: Record<string, string> = {
    ts: 'application/typescript',
    js: 'application/javascript',
    json: 'application/json',
    sql: 'application/sql',
    md: 'text/markdown',
    txt: 'text/plain',
    pdf: 'application/pdf',
    png: 'image/png',
  };

  const poolOptions = [
    { pool: codeFolderPool, exts: ['ts', 'js', 'json', 'sql', 'md'] },
    { pool: textFolders, exts: ['txt', 'md'] },
    { pool: pdfFolders, exts: ['pdf'] },
    { pool: paintFolders, exts: ['png'] },
  ];

  let batchRemaining = remainingNeeded;
  let batchIndex = 0;

  while (batchRemaining > 0) {
    const currentBatchCount = Math.min(BATCH_SIZE, batchRemaining);
    const placeholders: string[] = [];
    const values: any[] = [];

    for (let i = 0; i < currentBatchCount; i++) {
      const category = poolOptions[Math.floor(Math.random() * poolOptions.length)];
      const parent = category.pool[Math.floor(Math.random() * category.pool.length)];
      const ext = category.exts[Math.floor(Math.random() * category.exts.length)];

      const itemNum = totalInserted + i;
      const fileName = ext === 'json'
        ? `config_${itemNum}.json`
        : ext === 'ts' || ext === 'js'
        ? `module_${itemNum}.${ext}`
        : ext === 'sql'
        ? `migration_${itemNum}.sql`
        : ext === 'md'
        ? `doc_${itemNum}.md`
        : ext === 'pdf'
        ? `documento_${itemNum}.pdf`
        : ext === 'png'
        ? `dibujo_${itemNum}.png`
        : `nota_${itemNum}.${ext}`;

      const ltreeLabel = `n_${itemNum}`;
      const nodePath = `${parent.path}.${ltreeLabel}`;
      const mime = mimeMap[ext] || 'application/octet-stream';
      const sizeBytes = Math.floor(Math.random() * 45000 + 512);

      const offset = i * 6;
      placeholders.push(
        `($${offset + 1}::uuid, $${offset + 2}::uuid, $${offset + 3}, 'file', $${offset + 4}::ltree, $${offset + 5}, $${offset + 6}::bigint, 'VIRTUAL')`
      );
      values.push(DEFAULT_USER_ID, parent.id, fileName, nodePath, mime, sizeBytes);
    }

    const query = `
      INSERT INTO filesystem_nodes (user_id, parent_id, name, type, path, mime_type, size_bytes, storage_type)
      VALUES ${placeholders.join(', ')}
    `;

    await client.query(query, values);
    totalInserted += currentBatchCount;
    batchRemaining -= currentBatchCount;
    batchIndex++;

    process.stdout.write(`\rInsertados: ${totalInserted} / ${TARGET_TOTAL} nodos (${((totalInserted / TARGET_TOTAL) * 100).toFixed(1)}%)`);
  }

  console.log('\n');
  console.log(`==> SEEDING COMPLETADO: ${totalInserted} nodos insertados exactamente.`);
  console.timeEnd('Tiempo total de seeding');

  // Comprobar conteo final
  const countCheck = await client.query('SELECT COUNT(*) as total FROM filesystem_nodes;');
  console.log(`==> Verificación en BD: Total de filas en filesystem_nodes = ${countCheck.rows[0].total}`);

  await client.end();
}

runSeed().catch((err) => {
  console.error('\nError en seed:', err);
  process.exit(1);
});