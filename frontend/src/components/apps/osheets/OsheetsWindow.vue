<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useWindowStore } from '@/stores/windowStore';
import { useDesktopStore } from '@/stores/desktopStore';
import { notifyFilesystemChanged } from '@/stores/filesystem';
import { useWindowBounds } from '@/composables/useWindowBounds';
import osheetsSvg from '@/assets/osheets.svg';

const winStore = useWindowStore();
const desktopStore = useDesktopStore();
const winState = winStore.windows['osheets'];
const { x, y, width, height, startDrag, startResize } = useWindowBounds(160, 80, 820, 520);

const currentFileId = ref<string | null>(null);
const fileName = ref('Nuevo Documento.csv');
const rawCsv = ref('');
const isSaved = ref(true);
const filterQuery = ref('');
const activeView = ref<'grid' | 'raw'>('grid');
const errorMessage = ref('');
const successMessage = ref('');

const headers = ref<string[]>(['id', 'nombre', 'categoria', 'precio']);
const rows = ref<string[][]>([
  ['1', 'Portátil Pro', 'Electrónica', '1199.99'],
  ['2', 'Teclado Mecánico', 'Accesorios', '89.50'],
  ['3', 'Monitor UltraWide', 'Pantallas', '450.00'],
  ['4', 'Ratón Óptico', 'Accesorios', '29.90'],
]);

function parseCsvContent(content: string) {
  const lines = content.trim().split('\n').filter(Boolean);
  const firstLine = lines[0];
  if (!firstLine || lines.length === 0) {
    headers.value = ['columna_1', 'columna_2', 'columna_3'];
    rows.value = [['', '', '']];
    return;
  }

  headers.value = firstLine.split(',').map((h) => h.replace(/^"|"$/g, '').trim());
  rows.value = lines.slice(1).map((line) =>
    line.split(',').map((cell) => cell.replace(/^"|"$/g, '').trim())
  );
}

function syncRawFromGrid() {
  const headerLine = headers.value.map((h) => (h.includes(',') ? `"${h}"` : h)).join(',');
  const rowLines = rows.value.map((r) =>
    r.map((c) => (c.includes(',') ? `"${c}"` : c)).join(',')
  );
  rawCsv.value = [headerLine, ...rowLines].join('\n');
  isSaved.value = false;
}

watch(
  () => winState.data,
  (newData) => {
    errorMessage.value = '';
    successMessage.value = '';

    if (newData) {
      if (newData.fileId) {
        currentFileId.value = newData.fileId;
      } else {
        currentFileId.value = null;
      }

      fileName.value = newData.name || 'Nuevo Documento.csv';

      if (newData.content !== undefined && newData.content !== null && newData.content !== '') {
        rawCsv.value = newData.content;
        parseCsvContent(newData.content);
        isSaved.value = true;
        winStore.windows['osheets'].title = fileName.value;
        return;
      } else if (newData.fileId) {
        // Cargar desde endpoint raw (soporta CSVs virtuales generados y físicos)
        fetch(`/api/files/${newData.fileId}/raw`)
          .then((res) => (res.ok ? res.text() : ''))
          .then((text) => {
            if (currentFileId.value === newData.fileId) {
              rawCsv.value = text;
              parseCsvContent(text);
              isSaved.value = true;
              winStore.windows['osheets'].title = fileName.value;
            }
          })
          .catch(() => {
            createNewSheet();
          });
        return;
      } else if (newData.isNew) {
        createNewSheet();
        return;
      }
      isSaved.value = true;
      winStore.windows['osheets'].title = fileName.value;
      return;
    }

    createNewSheet();
  },
  { immediate: true }
);

function createNewSheet() {
  currentFileId.value = null;
  winStore.windows['osheets'].data = null;
  fileName.value = 'Nuevo Documento.csv';
  headers.value = ['id', 'producto', 'categoria', 'precio', 'stock'];
  rows.value = [
    ['1', 'Teclado Mecánico', 'Periféricos', '79.99', '15'],
    ['2', 'Ratón Inalámbrico', 'Periféricos', '39.99', '28'],
    ['3', 'Monitor 4K', 'Monitores', '299.00', '8'],
    ['4', 'Auriculares Pro', 'Audio', '119.50', '20'],
  ];
  syncRawFromGrid();
  isSaved.value = true;
  errorMessage.value = '';
  winStore.windows['osheets'].title = fileName.value;
}

function addRow() {
  rows.value.push(new Array(headers.value.length).fill(''));
  syncRawFromGrid();
}

function removeRow(idx: number) {
  if (rows.value.length <= 1) {
    rows.value = [new Array(headers.value.length).fill('')];
  } else {
    rows.value.splice(idx, 1);
  }
  syncRawFromGrid();
}

function addColumn() {
  const newColName = `col_${headers.value.length + 1}`;
  headers.value.push(newColName);
  for (const row of rows.value) {
    row.push('');
  }
  syncRawFromGrid();
}

function removeColumn(cIdx: number) {
  if (headers.value.length <= 1) return;
  headers.value.splice(cIdx, 1);
  for (const row of rows.value) {
    row.splice(cIdx, 1);
  }
  syncRawFromGrid();
}

function onCellInput(rIdx: number, cIdx: number, event: Event) {
  const target = event.target as HTMLInputElement;
  const targetRow = rows.value[rIdx];
  if (targetRow) {
    targetRow[cIdx] = target.value;
    syncRawFromGrid();
  }
}

function onHeaderInput(cIdx: number, event: Event) {
  const target = event.target as HTMLInputElement;
  headers.value[cIdx] = target.value;
  syncRawFromGrid();
}

function onRawInput() {
  isSaved.value = false;
  parseCsvContent(rawCsv.value);
}

function setSuccessFeedback(msg: string) {
  successMessage.value = msg;
  setTimeout(() => {
    if (successMessage.value === msg) {
      successMessage.value = '';
    }
  }, 3500);
}

async function saveSheet() {
  errorMessage.value = '';
  let cleanName = fileName.value.trim();

  if (!cleanName) {
    errorMessage.value = 'El nombre del archivo no puede estar vacío.';
    return;
  }

  if (!cleanName.toLowerCase().endsWith('.csv')) {
    cleanName += '.csv';
    fileName.value = cleanName;
  }

  if (activeView.value === 'raw') {
    parseCsvContent(rawCsv.value);
  } else {
    syncRawFromGrid();
  }

  try {
    if (currentFileId.value) {
      const res = await fetch(`/api/nodes/${currentFileId.value}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          content: rawCsv.value,
        }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      desktopStore.updateNoteContent(currentFileId.value, rawCsv.value);
      desktopStore.renameItem(currentFileId.value, cleanName);
      notifyFilesystemChanged();
      isSaved.value = true;
      winStore.windows['osheets'].title = cleanName;
      setSuccessFeedback('Hoja guardada correctamente');
    } else {
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          content: rawCsv.value,
          parentPath: 'root.desktop',
          is_directory: false,
          mime_type: 'text/csv',
        }),
      });
      if (!res.ok) throw new Error('Error al crear archivo');
      const node = await res.json();
      currentFileId.value = node.id;
      winStore.windows['osheets'].data = { name: cleanName, content: rawCsv.value, fileId: node.id };
      winStore.windows['osheets'].title = cleanName;
      isSaved.value = true;
      await desktopStore.fetchDesktopItems();
      notifyFilesystemChanged();
      setSuccessFeedback('Hoja creada y guardada en Escritorio');
    }
  } catch {
    errorMessage.value = 'Ocurrió un error al guardar la hoja de cálculo.';
  }
}

function downloadCsv() {
  if (currentFileId.value) {
    const a = document.createElement('a');
    a.href = `/api/files/${currentFileId.value}/download`;
    a.download = fileName.value;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    const blob = new Blob([rawCsv.value], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.value;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

const filteredRowsWithIndex = computed(() => {
  if (!filterQuery.value.trim()) {
    return rows.value.map((row, idx) => ({ row, idx }));
  }
  const q = filterQuery.value.toLowerCase();
  return rows.value
    .map((row, idx) => ({ row, idx }))
    .filter(({ row }) => row.some((cell) => cell.toLowerCase().includes(q)));
});

function handleDoubleClickHeader(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.win-controls')) {
    winStore.toggleMaximize('osheets');
  }
}
</script>

<template>
  <div
    v-show="!winState.isMinimized"
    class="osheets-window"
    :class="{ 'is-maximized': winState.isMaximized }"
    :style="
      winState.isMaximized
        ? { zIndex: winState.zIndex }
        : {
            left: `${x}px`,
            top: `${y}px`,
            width: `${width}px`,
            height: `${height}px`,
            zIndex: winState.zIndex
          }
    "
    @mousedown="winStore.focusWindow('osheets')"
  >
    <!-- Tiradores Resize -->
    <template v-if="!winState.isMaximized">
      <div class="resize-handle n" @mousedown="startResize($event, 'n', winState.isMaximized)"></div>
      <div class="resize-handle s" @mousedown="startResize($event, 's', winState.isMaximized)"></div>
      <div class="resize-handle e" @mousedown="startResize($event, 'e', winState.isMaximized)"></div>
      <div class="resize-handle w" @mousedown="startResize($event, 'w', winState.isMaximized)"></div>
      <div class="resize-handle ne" @mousedown="startResize($event, 'ne', winState.isMaximized)"></div>
      <div class="resize-handle nw" @mousedown="startResize($event, 'nw', winState.isMaximized)"></div>
      <div class="resize-handle se" @mousedown="startResize($event, 'se', winState.isMaximized)"></div>
      <div class="resize-handle sw" @mousedown="startResize($event, 'sw', winState.isMaximized)"></div>
    </template>

    <!-- Cabecera -->
    <header class="window-header" @mousedown="startDrag($event, winState.isMaximized)" @dblclick="handleDoubleClickHeader">
      <div class="window-title">
        <img :src="osheetsSvg" alt="Osheets" class="sheets-icon" />
        <span>{{ fileName }} {{ isSaved ? '' : '*' }} — Osheets</span>
      </div>

      <div class="win-controls" @mousedown.stop @dblclick.stop>
        <button class="win-btn" title="Minimizar" @click="winStore.toggleMinimize('osheets')">—</button>
        <button class="win-btn" title="Maximizar" @click="winStore.toggleMaximize('osheets')">
          {{ winState.isMaximized ? '❐' : '□' }}
        </button>
        <button class="win-btn close" title="Cerrar" @click="winStore.closeWindow('osheets')">✕</button>
      </div>
    </header>

    <!-- Barra de acciones -->
    <div class="sheets-toolbar">
      <div class="toolbar-left">
        <button class="sheet-btn" title="Crear nuevo CSV" @click="createNewSheet">
          📄 Nuevo CSV
        </button>
        <button class="sheet-btn primary" title="Guardar hoja" @click="saveSheet">
          💾 Guardar
        </button>
        <button class="sheet-btn" title="Descargar archivo CSV al equipo" @click="downloadCsv">
          ⬇️ Descargar
        </button>

        <div class="filename-box">
          <span class="file-label">Archivo:</span>
          <input
            v-model="fileName"
            type="text"
            class="filename-input"
            placeholder="datos.csv"
            @input="isSaved = false; errorMessage = ''"
          />
        </div>

        <div class="table-tools" v-if="activeView === 'grid'">
          <button class="sheet-btn sub" title="Añadir nueva fila" @click="addRow">+ Fila</button>
          <button class="sheet-btn sub" title="Añadir nueva columna" @click="addColumn">+ Columna</button>
        </div>
      </div>

      <div class="toolbar-right">
        <!-- Selector de Vista -->
        <div class="view-tabs">
          <button
            class="tab-btn"
            :class="{ active: activeView === 'grid' }"
            @click="activeView = 'grid'"
          >
            📊 Cuadrícula
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeView === 'raw' }"
            @click="activeView = 'raw'"
          >
            📝 Modo Texto
          </button>
        </div>

        <span v-if="successMessage" class="status-badge success">✓ {{ successMessage }}</span>
        <span v-else class="status-badge" :class="{ dirty: !isSaved }">
          {{ isSaved ? (currentFileId ? 'Guardado' : 'Borrador nuevo') : 'Cambios sin guardar' }}
        </span>
      </div>
    </div>

    <!-- Barra de filtro y métricas -->
    <div class="sheets-filterbar" v-if="activeView === 'grid'">
      <span class="badge-csv">CSV EDITOR</span>
      <input
        v-model="filterQuery"
        type="text"
        class="filter-input"
        placeholder="Filtrar filas en tiempo real..."
      />
      <span class="row-count">{{ filteredRowsWithIndex.length }} de {{ rows.length }} filas</span>
    </div>

    <!-- Banner de error -->
    <div v-if="errorMessage" class="error-banner">
      <span>⚠️ {{ errorMessage }}</span>
      <button class="close-alert" @click="errorMessage = ''">✕</button>
    </div>

    <!-- Vista de Cuadrícula Editable -->
    <div v-if="activeView === 'grid'" class="table-container">
      <table class="csv-table">
        <thead>
          <tr>
            <th class="row-index">#</th>
            <th v-for="(col, cIdx) in headers" :key="cIdx" class="col-header-th">
              <div class="col-header-box">
                <input
                  :value="col"
                  class="col-header-input"
                  @input="onHeaderInput(cIdx, $event)"
                  title="Editar nombre de columna"
                />
                <button
                  v-if="headers.length > 1"
                  class="del-col-btn"
                  title="Eliminar columna"
                  @click="removeColumn(cIdx)"
                >
                  ✕
                </button>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredRowsWithIndex" :key="item.idx">
            <td class="row-index">
              <div class="row-index-box">
                <span>{{ item.idx + 1 }}</span>
                <button class="del-row-btn" title="Eliminar fila" @click="removeRow(item.idx)">✕</button>
              </div>
            </td>
            <td v-for="(_, cIdx) in headers" :key="cIdx" class="cell-td">
              <input
                :value="item.row[cIdx] || ''"
                class="cell-input"
                @input="onCellInput(item.idx, cIdx, $event)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Vista de Texto CSV Crudo -->
    <div v-else class="raw-container">
      <textarea
        v-model="rawCsv"
        class="raw-editor"
        placeholder="Introduce datos en formato CSV separados por comas..."
        @input="onRawInput"
      ></textarea>
    </div>
  </div>
</template>

<style scoped>
.osheets-window {
  position: absolute;
  background: rgba(15, 23, 42, 0.94);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(52, 168, 83, 0.35);
  border-radius: 10px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}

.osheets-window.is-maximized {
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: calc(100vh - 50px) !important;
  border-radius: 0;
}

.resize-handle { position: absolute; z-index: 100; }
.resize-handle.n { top: 0; left: 6px; right: 6px; height: 6px; cursor: n-resize; }
.resize-handle.s { bottom: 0; left: 6px; right: 6px; height: 6px; cursor: s-resize; }
.resize-handle.e { top: 6px; bottom: 6px; right: 0; width: 6px; cursor: e-resize; }
.resize-handle.w { top: 6px; bottom: 6px; left: 0; width: 6px; cursor: w-resize; }
.resize-handle.ne { top: 0; right: 0; width: 10px; height: 10px; cursor: ne-resize; }
.resize-handle.nw { top: 0; left: 0; width: 10px; height: 10px; cursor: nw-resize; }
.resize-handle.se { bottom: 0; right: 0; width: 10px; height: 10px; cursor: se-resize; }
.resize-handle.sw { bottom: 0; left: 0; width: 10px; height: 10px; cursor: sw-resize; }

.window-header {
  height: 38px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  cursor: grab;
}
.window-header:active { cursor: grabbing; }

.window-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #f8fafc;
}
.sheets-icon { width: 18px; height: 18px; object-fit: contain; }

.win-controls { display: flex; gap: 4px; }
.win-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
}
.win-btn:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
.win-btn.close:hover { background: #ef4444; color: #fff; }

.sheets-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sheet-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #f8fafc;
  padding: 4px 10px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
}
.sheet-btn:hover { background: rgba(255, 255, 255, 0.16); }
.sheet-btn.primary {
  background: rgba(52, 168, 83, 0.25);
  border-color: rgba(52, 168, 83, 0.5);
  color: #86efac;
}
.sheet-btn.primary:hover { background: rgba(52, 168, 83, 0.4); color: #fff; }
.sheet-btn.sub {
  background: rgba(255, 255, 255, 0.05);
  font-size: 11px;
  padding: 3px 8px;
}

.filename-box {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
}
.file-label { font-size: 11px; color: #94a3b8; }
.filename-input {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 11px;
  font-family: monospace;
  outline: none;
  min-width: 140px;
}
.filename-input:focus { border-color: #4ade80; }

.table-tools {
  display: flex;
  align-items: center;
  gap: 6px;
}

.view-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 5px;
  padding: 2px;
}
.tab-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
}
.tab-btn.active {
  background: rgba(52, 168, 83, 0.35);
  color: #86efac;
  font-weight: 600;
}

.status-badge { font-size: 11px; color: #4ade80; }
.status-badge.dirty { color: #facc15; }
.status-badge.success { color: #38bdf8; font-weight: 500; }

.sheets-filterbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.badge-csv {
  background: rgba(52, 168, 83, 0.2);
  color: #4ade80;
  border: 1px solid rgba(52, 168, 83, 0.4);
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.filter-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  padding: 4px 10px;
  color: #fff;
  font-size: 11px;
  outline: none;
}
.filter-input:focus { border-color: #4ade80; }
.row-count { font-size: 11px; color: #94a3b8; font-family: monospace; }

.error-banner {
  background: rgba(239, 68, 68, 0.2);
  border-bottom: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  padding: 5px 12px;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.close-alert { background: transparent; border: none; color: #fca5a5; cursor: pointer; }

.table-container {
  flex: 1;
  overflow: auto;
}

.csv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  color: #e2e8f0;
}

.col-header-th {
  position: sticky;
  top: 0;
  background: #1e293b;
  color: #4ade80;
  font-weight: 600;
  padding: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  min-width: 120px;
  z-index: 10;
}

.col-header-box {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  gap: 4px;
}

.col-header-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #86efac;
  font-size: 12px;
  font-weight: 600;
  outline: none;
  font-family: monospace;
}
.col-header-input:focus {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.del-col-btn {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 10px;
  padding: 2px;
  border-radius: 2px;
}
.del-col-btn:hover { color: #f87171; }

.row-index {
  width: 44px;
  min-width: 44px;
  background: rgba(15, 23, 42, 0.7);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  user-select: none;
  padding: 0;
}

.row-index-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px;
  color: #64748b;
  font-family: monospace;
  font-size: 11px;
}

.del-row-btn {
  background: transparent;
  border: none;
  color: #475569;
  cursor: pointer;
  font-size: 9px;
  padding: 1px;
}
.del-row-btn:hover { color: #f87171; }

.cell-td {
  padding: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
}

.cell-input {
  width: 100%;
  box-sizing: border-box;
  background: transparent;
  border: none;
  color: #f1f5f9;
  padding: 6px 10px;
  font-size: 12px;
  font-family: monospace;
  outline: none;
}
.cell-input:focus {
  background: rgba(52, 168, 83, 0.12);
  box-shadow: inset 0 0 0 1px #4ade80;
}

.raw-container {
  flex: 1;
  display: flex;
  padding: 8px;
}

.raw-editor {
  flex: 1;
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: #f1f5f9;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  padding: 12px;
  resize: none;
  outline: none;
  user-select: text;
}
.raw-editor:focus { border-color: #4ade80; }
</style>