<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useWindowStore } from '@/stores/windowStore';
import { useWindowBounds } from '@/composables/useWindowBounds';
import osheetsSvg from '@/assets/osheets.svg';

const winStore = useWindowStore();
const winState = winStore.windows['osheets'];
const { x, y, width, height, startDrag, startResize } = useWindowBounds(160, 80, 740, 480);

const filterQuery = ref('');

const fileName = computed(() => winState.data?.name || 'datos.csv');
const rawCsv = computed(() => winState.data?.content || '');

watch(
  () => winState.data,
  () => {
    if (winState) {
      winStore.windows['osheets'].title = fileName.value;
    }
  },
  { immediate: true }
);

const parsedTable = computed(() => {
  const lines = rawCsv.value.trim().split('\n').filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map((h: string) => h.replace(/^"|"$/g, '').trim());
  const rows = lines.slice(1).map((line: string) =>
    line.split(',').map((cell: string) => cell.replace(/^"|"$/g, '').trim())
  );

  return { headers, rows };
});

const filteredRows = computed(() => {
  if (!filterQuery.value.trim()) return parsedTable.value.rows;
  const q = filterQuery.value.toLowerCase();
  return parsedTable.value.rows.filter((row: string[]) =>
    row.some((cell) => cell.toLowerCase().includes(q))
  );
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
        <span>{{ fileName }} — Osheets</span>
      </div>

      <div class="win-controls" @mousedown.stop @dblclick.stop>
        <button class="win-btn" @click="winStore.toggleMinimize('osheets')">—</button>
        <button class="win-btn" @click="winStore.toggleMaximize('osheets')">
          {{ winState.isMaximized ? '❐' : '□' }}
        </button>
        <button class="win-btn close" @click="winStore.closeWindow('osheets')">✕</button>
      </div>
    </header>

    <!-- Barra de filtro CSV -->
    <div class="sheets-toolbar">
      <span class="badge-csv">CSV PARSER</span>
      <input
        v-model="filterQuery"
        type="text"
        class="filter-input"
        placeholder="Filtrar filas en tiempo real..."
      />
      <span class="row-count">{{ filteredRows.length }} filas</span>
    </div>

    <!-- Tabla de Datos -->
    <div class="table-container">
      <table class="csv-table">
        <thead>
          <tr>
            <th class="row-index">#</th>
            <th v-for="(col, idx) in parsedTable.headers" :key="idx">{{ col }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rIdx) in filteredRows" :key="rIdx">
            <td class="row-index">{{ Number(rIdx) + 1 }}</td>
            <td v-for="(cell, cIdx) in row" :key="cIdx">{{ cell }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.osheets-window {
  position: absolute;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(52, 168, 83, 0.3);
  border-radius: 10px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
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
  gap: 12px;
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.25);
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
  border-radius: 6px;
  padding: 5px 10px;
  color: #fff;
  font-size: 12px;
  outline: none;
}
.filter-input:focus { border-color: #4ade80; }

.row-count { font-size: 12px; color: #94a3b8; font-family: monospace; }

.table-container {
  flex: 1;
  overflow: auto;
}

.csv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: #e2e8f0;
}

.csv-table th {
  position: sticky;
  top: 0;
  background: #1e293b;
  color: #4ade80;
  font-weight: 600;
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
}

.csv-table td {
  padding: 7px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  font-family: monospace;
}

.csv-table tr:hover td {
  background: rgba(255, 255, 255, 0.04);
}

.row-index {
  width: 42px;
  text-align: center !important;
  color: #64748b !important;
  background: rgba(15, 23, 42, 0.6);
  user-select: none;
}
</style>