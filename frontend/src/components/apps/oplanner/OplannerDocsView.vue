<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { useOplannerStore } from '@/stores/oplannerStore';
import type { DocBlock, DocBlockType } from '@/types/oplanner';

const store = useOplannerStore();

// Estado del menú flotante de comandos Slash (/)
const slashMenuOpen = ref(false);
const slashBlockId = ref<string | null>(null);
const slashMenuIndex = ref(0);
const slashMenuPos = ref({ top: 0, left: 0 });
const slashFilter = ref('');

// Modal para vincular tarea en bloque task_mention
const taskPickerOpen = ref(false);
const taskPickerBlockId = ref<string | null>(null);

const slashCommands = [
  { type: 'h1' as DocBlockType, label: 'Encabezado 1', icon: 'H1', desc: 'Título principal grande' },
  { type: 'h2' as DocBlockType, label: 'Encabezado 2', icon: 'H2', desc: 'Sección media' },
  { type: 'h3' as DocBlockType, label: 'Encabezado 3', icon: 'H3', desc: 'Subsección' },
  { type: 'paragraph' as DocBlockType, label: 'Texto normal', icon: '¶', desc: 'Párrafo de texto plano' },
  { type: 'checklist' as DocBlockType, label: 'Lista de tareas', icon: '☑️', desc: 'Item interactivo con checkbox' },
  { type: 'code' as DocBlockType, label: 'Bloque de código', icon: '</>', desc: 'Snippet con formato monospace' },
  { type: 'callout' as DocBlockType, label: 'Alerta / Callout', icon: '💡', desc: 'Caja destacada con llamada a la acción' },
  { type: 'task_mention' as DocBlockType, label: 'Mención a Tarea', icon: '📌', desc: 'Tarjeta vinculada a una tarea del Kanban' },
];

const filteredCommands = computed(() => {
  if (!slashFilter.value) return slashCommands;
  const q = slashFilter.value.toLowerCase();
  return slashCommands.filter(
    (c) => c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)
  );
});

function getTaskById(taskId?: string) {
  if (!taskId) return null;
  return store.currentProject.tasks.find((t) => t.id === taskId) || null;
}

function handleInput(block: DocBlock, e: Event) {
  const target = e.target as HTMLElement;
  const text = target.innerText;

  // Detectar comando slash
  if (text.startsWith('/')) {
    slashBlockId.value = block.id;
    slashFilter.value = text.slice(1).trim();
    slashMenuIndex.value = 0;

    const rect = target.getBoundingClientRect();
    const parentRect = target.closest('.docs-view')?.getBoundingClientRect();
    if (parentRect) {
      slashMenuPos.value = {
        top: rect.bottom - parentRect.top + 6,
        left: Math.max(10, rect.left - parentRect.left),
      };
    }
    slashMenuOpen.value = true;
  } else {
    if (slashMenuOpen.value) {
      closeSlashMenu();
    }
    store.updateDocBlock(block.id, { content: text });
  }
}

function closeSlashMenu() {
  slashMenuOpen.value = false;
  slashBlockId.value = null;
  slashFilter.value = '';
}

function selectCommand(cmd: typeof slashCommands[0]) {
  if (!slashBlockId.value) return;
  const bId = slashBlockId.value;

  if (cmd.type === 'task_mention') {
    taskPickerBlockId.value = bId;
    taskPickerOpen.value = true;
    closeSlashMenu();
    return;
  }

  store.updateDocBlock(bId, {
    type: cmd.type,
    content: '',
    checked: cmd.type === 'checklist' ? false : undefined,
    language: cmd.type === 'code' ? 'typescript' : undefined,
    calloutType: cmd.type === 'callout' ? 'info' : undefined,
  });

  closeSlashMenu();

  nextTick(() => {
    const el = document.getElementById(`doc-block-${bId}`);
    if (el) {
      el.focus();
    }
  });
}

function pickTaskForMention(taskId: string) {
  if (!taskPickerBlockId.value) return;
  const task = getTaskById(taskId);
  store.updateDocBlock(taskPickerBlockId.value, {
    type: 'task_mention',
    taskId,
    content: task?.title || 'Tarea vinculada',
  });
  taskPickerOpen.value = false;
  taskPickerBlockId.value = null;
}

function handleKeyDown(block: DocBlock, e: KeyboardEvent) {
  // Manejo de navegación en menú flotante slash
  if (slashMenuOpen.value) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      slashMenuIndex.value = (slashMenuIndex.value + 1) % filteredCommands.value.length;
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      slashMenuIndex.value =
        (slashMenuIndex.value - 1 + filteredCommands.value.length) % filteredCommands.value.length;
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filteredCommands.value[slashMenuIndex.value];
      if (cmd) selectCommand(cmd);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSlashMenu();
      return;
    }
  }

  // Pulsar Enter para crear un nuevo bloque abajo
  if (e.key === 'Enter' && !e.shiftKey && block.type !== 'code') {
    e.preventDefault();
    const newBlock = store.addDocBlock('paragraph', block.id, '');
    nextTick(() => {
      const el = document.getElementById(`doc-block-${newBlock.id}`);
      if (el) el.focus();
    });
    return;
  }

  // Pulsar Backspace en bloque vacío para borrarlo o transformarlo en paragraph
  if (e.key === 'Backspace') {
    const target = e.target as HTMLElement;
    if (!target.innerText || target.innerText === '\n') {
      if (block.type !== 'paragraph') {
        e.preventDefault();
        store.updateDocBlock(block.id, { type: 'paragraph' });
      } else if (store.currentProject.docs.length > 1) {
        e.preventDefault();
        const idx = store.currentProject.docs.findIndex((b) => b.id === block.id);
        store.deleteDocBlock(block.id);
        nextTick(() => {
          const prevBlock = store.currentProject.docs[Math.max(0, idx - 1)];
          if (prevBlock) {
            const el = document.getElementById(`doc-block-${prevBlock.id}`);
            if (el) el.focus();
          }
        });
      }
    }
  }
}

function toggleChecklist(block: DocBlock) {
  store.updateDocBlock(block.id, { checked: !block.checked });
}

function handleAddBlockAtEnd() {
  const newBlock = store.addDocBlock('paragraph', undefined, '');
  nextTick(() => {
    const el = document.getElementById(`doc-block-${newBlock.id}`);
    if (el) el.focus();
  });
}
</script>

<template>
  <div class="docs-view" @click="slashMenuOpen ? closeSlashMenu() : null">
    <div class="docs-canvas">
      <!-- Metadatos de cabecera del documento -->
      <div class="doc-header">
        <h1 class="project-doc-title">{{ store.currentProject.name }}</h1>
        <p class="project-doc-desc">{{ store.currentProject.description }}</p>
        <div class="doc-meta-bar">
          <span class="meta-tag">📄 {{ store.currentProject.docs.length }} bloques</span>
          <span class="meta-tag">⚡ {{ store.currentProject.tasks.length }} tareas vinculadas</span>
          <span class="meta-hint">Tip: Escribe <code>/</code> en cualquier línea para insertar bloques</span>
        </div>
      </div>

      <!-- Bloques de documentación -->
      <div class="blocks-container">
        <div
          v-for="(block, index) in store.currentProject.docs"
          :key="block.id"
          class="block-wrapper"
          :class="`type-${block.type}`"
        >
          <!-- Acción lateral para mover o borrar bloque -->
          <div class="block-drag-handle" title="Mover bloque">
            <span class="handle-dots">⋮⋮</span>
          </div>

          <!-- 1. Encabezado H1 -->
          <h1
            v-if="block.type === 'h1'"
            :id="`doc-block-${block.id}`"
            class="editable-block heading-1"
            contenteditable="true"
            @input="handleInput(block, $event)"
            @keydown="handleKeyDown(block, $event)"
          >{{ block.content }}</h1>

          <!-- 2. Encabezado H2 -->
          <h2
            v-else-if="block.type === 'h2'"
            :id="`doc-block-${block.id}`"
            class="editable-block heading-2"
            contenteditable="true"
            @input="handleInput(block, $event)"
            @keydown="handleKeyDown(block, $event)"
          >{{ block.content }}</h2>

          <!-- 3. Encabezado H3 -->
          <h3
            v-else-if="block.type === 'h3'"
            :id="`doc-block-${block.id}`"
            class="editable-block heading-3"
            contenteditable="true"
            @input="handleInput(block, $event)"
            @keydown="handleKeyDown(block, $event)"
          >{{ block.content }}</h3>

          <!-- 4. Párrafo normal -->
          <p
            v-else-if="block.type === 'paragraph'"
            :id="`doc-block-${block.id}`"
            class="editable-block paragraph-block"
            contenteditable="true"
            data-placeholder="Escribe algo o pulsa '/' para comandos..."
            @input="handleInput(block, $event)"
            @keydown="handleKeyDown(block, $event)"
          >{{ block.content }}</p>

          <!-- 5. Checklist -->
          <div v-else-if="block.type === 'checklist'" class="checklist-block">
            <input
              type="checkbox"
              class="checklist-checkbox"
              :checked="block.checked"
              @change="toggleChecklist(block)"
            />
            <span
              :id="`doc-block-${block.id}`"
              class="editable-block checklist-text"
              :class="{ 'is-checked': block.checked }"
              contenteditable="true"
              @input="handleInput(block, $event)"
              @keydown="handleKeyDown(block, $event)"
            >{{ block.content }}</span>
          </div>

          <!-- 6. Bloque de código -->
          <div v-else-if="block.type === 'code'" class="code-block-container">
            <div class="code-header">
              <span class="code-lang">{{ block.language || 'typescript' }}</span>
              <button
                class="block-delete-btn"
                title="Eliminar bloque"
                @click="store.deleteDocBlock(block.id)"
              >✕</button>
            </div>
            <pre
              :id="`doc-block-${block.id}`"
              class="editable-block code-content"
              contenteditable="true"
              @input="handleInput(block, $event)"
              @keydown="handleKeyDown(block, $event)"
            >{{ block.content }}</pre>
          </div>

          <!-- 7. Callout -->
          <div v-else-if="block.type === 'callout'" class="callout-block">
            <span class="callout-icon">💡</span>
            <div
              :id="`doc-block-${block.id}`"
              class="editable-block callout-content"
              contenteditable="true"
              @input="handleInput(block, $event)"
              @keydown="handleKeyDown(block, $event)"
            >{{ block.content }}</div>
          </div>

          <!-- 8. Mención a Tarea (Task Mention interactiva) -->
          <div v-else-if="block.type === 'task_mention'" class="task-mention-card">
            <div class="mention-left">
              <span class="mention-pin">📌</span>
              <div v-if="getTaskById(block.taskId)" class="mention-task-info">
                <span class="mention-code">{{ getTaskById(block.taskId)?.code }}</span>
                <span class="mention-title">{{ getTaskById(block.taskId)?.title }}</span>
                <span
                  class="mention-status-badge"
                  :class="`status-${getTaskById(block.taskId)?.status}`"
                >
                  {{ getTaskById(block.taskId)?.status.toUpperCase() }}
                </span>
              </div>
              <div v-else class="mention-missing">
                <span>{{ block.content || 'Tarea no vinculada' }}</span>
              </div>
            </div>
            <div class="mention-actions">
              <button
                v-if="block.taskId"
                class="mention-view-btn"
                @click="store.openTaskDrawer(block.taskId)"
              >
                Ver Tarea →
              </button>
              <button
                class="block-delete-btn"
                title="Eliminar mención"
                @click="store.deleteDocBlock(block.id)"
              >✕</button>
            </div>
          </div>
        </div>

        <!-- Botón para añadir bloque al final -->
        <div class="add-block-row" @click="handleAddBlockAtEnd">
          <span>+ Haz clic para añadir un bloque o escribe '/'</span>
        </div>
      </div>
    </div>

    <!-- Menú Flotante de Comandos Slash (/) -->
    <div
      v-if="slashMenuOpen"
      class="slash-menu"
      :style="{ top: `${slashMenuPos.top}px`, left: `${slashMenuPos.left}px` }"
      @click.stop
    >
      <div class="slash-menu-header">
        <span>Insertar Bloque</span>
        <span v-if="slashFilter" class="slash-filter-badge">{{ slashFilter }}</span>
      </div>
      <div class="slash-menu-list">
        <div
          v-for="(cmd, i) in filteredCommands"
          :key="cmd.type"
          class="slash-item"
          :class="{ 'is-selected': i === slashMenuIndex }"
          @mouseenter="slashMenuIndex = i"
          @click="selectCommand(cmd)"
        >
          <div class="slash-icon-wrap">{{ cmd.icon }}</div>
          <div class="slash-text-wrap">
            <div class="slash-item-title">{{ cmd.label }}</div>
            <div class="slash-item-desc">{{ cmd.desc }}</div>
          </div>
        </div>
        <div v-if="filteredCommands.length === 0" class="slash-no-results">
          No hay comandos coincidentes
        </div>
      </div>
    </div>

    <!-- Modal selector de tarea para Task Mention -->
    <div v-if="taskPickerOpen" class="task-picker-modal" @click="taskPickerOpen = false">
      <div class="picker-dialog" @click.stop>
        <header class="picker-header">
          <h3>Vincular Tarea del Proyecto</h3>
          <button class="picker-close-btn" @click="taskPickerOpen = false">✕</button>
        </header>
        <div class="picker-list">
          <div
            v-for="task in store.currentProject.tasks"
            :key="task.id"
            class="picker-task-item"
            @click="pickTaskForMention(task.id)"
          >
            <span class="picker-code">{{ task.code }}</span>
            <span class="picker-title">{{ task.title }}</span>
            <span class="picker-status">{{ task.status }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.docs-view {
  flex: 1;
  overflow-y: auto;
  background-color: #0b0f17;
  padding: 30px 20px;
  display: flex;
  justify-content: center;
  position: relative;
}

.docs-view::-webkit-scrollbar {
  width: 6px;
}
.docs-view::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 4px;
}

.docs-canvas {
  width: 100%;
  max-width: 780px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.doc-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 20px;
}

.project-doc-title {
  font-size: 28px;
  font-weight: 700;
  color: #f8fafc;
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
}

.project-doc-desc {
  font-size: 14px;
  color: #94a3b8;
  margin: 0 0 14px 0;
  line-height: 1.5;
}

.doc-meta-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #64748b;
}

.meta-tag {
  background: rgba(255, 255, 255, 0.05);
  padding: 3px 8px;
  border-radius: 5px;
  color: #cbd5e1;
}

.meta-hint code {
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.1);
  padding: 1px 5px;
  border-radius: 3px;
  font-family: ui-monospace, monospace;
}

.blocks-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.block-wrapper {
  position: relative;
  display: flex;
  align-items: flex-start;
  border-radius: 6px;
  padding: 3px 6px;
  transition: background 0.12s ease;
}

.block-wrapper:hover {
  background: rgba(255, 255, 255, 0.02);
}

.block-drag-handle {
  position: absolute;
  left: -22px;
  top: 6px;
  opacity: 0;
  cursor: grab;
  color: #475569;
  font-size: 12px;
  user-select: none;
  transition: opacity 0.15s ease;
}

.block-wrapper:hover .block-drag-handle {
  opacity: 0.8;
}

.editable-block {
  flex: 1;
  outline: none;
  color: #e2e8f0;
  word-break: break-word;
  white-space: pre-wrap;
  min-height: 24px;
  line-height: 1.6;
}

.editable-block:empty:before {
  content: attr(data-placeholder);
  color: #475569;
}

.heading-1 {
  font-size: 24px;
  font-weight: 700;
  color: #f8fafc;
  margin: 12px 0 4px 0;
  letter-spacing: -0.3px;
}

.heading-2 {
  font-size: 19px;
  font-weight: 600;
  color: #f1f5f9;
  margin: 10px 0 4px 0;
}

.heading-3 {
  font-size: 16px;
  font-weight: 600;
  color: #e2e8f0;
  margin: 8px 0 2px 0;
}

.paragraph-block {
  font-size: 14px;
  color: #cbd5e1;
  margin: 0;
}

.checklist-block {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.checklist-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #38bdf8;
  cursor: pointer;
}

.checklist-text {
  font-size: 14px;
  color: #e2e8f0;
}

.checklist-text.is-checked {
  text-decoration: line-through;
  color: #64748b;
}

.code-block-container {
  width: 100%;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.code-lang {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: #38bdf8;
  font-weight: 600;
  text-transform: uppercase;
}

.block-delete-btn {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
}

.block-delete-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.15);
}

.code-content {
  padding: 12px;
  font-family: ui-monospace, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #7dd3fc;
  margin: 0;
  overflow-x: auto;
}

.callout-block {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(56, 189, 248, 0.08);
  border-left: 3px solid #38bdf8;
  border-radius: 6px;
  padding: 12px 14px;
}

.callout-icon {
  font-size: 18px;
  line-height: 1.3;
}

.callout-content {
  font-size: 13.5px;
  color: #e0f2fe;
}

.task-mention-card {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #131c2e;
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.mention-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mention-pin {
  font-size: 16px;
}

.mention-task-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mention-code {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  font-weight: 700;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
}

.mention-title {
  font-size: 13px;
  font-weight: 500;
  color: #f1f5f9;
}

.mention-status-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.mention-status-badge.status-backlog { background: rgba(148, 163, 184, 0.15); color: #cbd5e1; }
.mention-status-badge.status-todo { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
.mention-status-badge.status-in_progress { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.mention-status-badge.status-done { background: rgba(16, 185, 129, 0.15); color: #10b981; }

.mention-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mention-view-btn {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 5px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mention-view-btn:hover {
  background: rgba(56, 189, 248, 0.3);
}

.add-block-row {
  padding: 14px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  text-align: center;
  color: #64748b;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-top: 10px;
}

.add-block-row:hover {
  border-color: rgba(56, 189, 248, 0.3);
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.03);
}

/* Menú Flotante Slash (/) */
.slash-menu {
  position: absolute;
  z-index: 50;
  width: 290px;
  background: #111726;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);
  overflow: hidden;
}

.slash-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.25);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.slash-filter-badge {
  background: #38bdf8;
  color: #0b0f17;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
}

.slash-menu-list {
  max-height: 280px;
  overflow-y: auto;
  padding: 4px;
}

.slash-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.slash-item.is-selected,
.slash-item:hover {
  background: rgba(56, 189, 248, 0.15);
}

.slash-icon-wrap {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #f1f5f9;
}

.slash-text-wrap {
  display: flex;
  flex-direction: column;
}

.slash-item-title {
  font-size: 13px;
  font-weight: 600;
  color: #f8fafc;
}

.slash-item-desc {
  font-size: 11px;
  color: #94a3b8;
}

.slash-no-results {
  padding: 14px;
  text-align: center;
  color: #64748b;
  font-size: 12px;
}

/* Modal Selector de Tareas */
.task-picker-modal {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
  backdrop-filter: blur(4px);
}

.picker-dialog {
  width: 480px;
  max-height: 400px;
  background: #111726;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.picker-header {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.picker-header h3 {
  margin: 0;
  font-size: 15px;
  color: #f8fafc;
}

.picker-close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 14px;
}

.picker-list {
  padding: 10px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.picker-task-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: all 0.15s ease;
}

.picker-task-item:hover {
  background: rgba(56, 189, 248, 0.15);
}

.picker-code {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  font-weight: 700;
  color: #38bdf8;
}

.picker-title {
  flex: 1;
  font-size: 13px;
  color: #f1f5f9;
}

.picker-status {
  font-size: 10px;
  text-transform: uppercase;
  color: #94a3b8;
  font-weight: 600;
}
</style>
