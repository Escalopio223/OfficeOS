<script setup lang="ts">
import { ref } from 'vue';
import { useOplannerStore } from '@/stores/oplannerStore';
import type { TaskItem, TaskPriority, TaskStatus } from '@/types/oplanner';

const store = useOplannerStore();

const editingTitleTaskId = ref<string | null>(null);
const tempTitle = ref('');

function startEditingTitle(task: TaskItem) {
  editingTitleTaskId.value = task.id;
  tempTitle.value = task.title;
}

function saveTitle(task: TaskItem) {
  if (editingTitleTaskId.value === task.id) {
    if (tempTitle.value.trim() && tempTitle.value !== task.title) {
      store.updateTask(task.id, { title: tempTitle.value.trim() });
    }
    editingTitleTaskId.value = null;
  }
}

function cancelEditingTitle() {
  editingTitleTaskId.value = null;
}

function handleStatusChange(task: TaskItem, e: Event) {
  const target = e.target as HTMLSelectElement;
  store.updateTask(task.id, { status: target.value as TaskStatus });
}

function handlePriorityChange(task: TaskItem, e: Event) {
  const target = e.target as HTMLSelectElement;
  store.updateTask(task.id, { priority: target.value as TaskPriority });
}

function handleDueDateChange(task: TaskItem, e: Event) {
  const target = e.target as HTMLInputElement;
  store.updateTask(task.id, { dueDate: target.value || null });
}

function toggleSort(col: 'position' | 'priority' | 'dueDate' | 'title' | 'status') {
  if (store.sortBy === col) {
    store.sortOrder = store.sortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    store.sortBy = col;
    store.sortOrder = 'asc';
  }
}

function getSortIndicator(col: string) {
  if (store.sortBy !== col) return '↕';
  return store.sortOrder === 'asc' ? '↑' : '↓';
}

function getSubtaskFraction(task: TaskItem) {
  if (!task.subtasks || task.subtasks.length === 0) return '—';
  const done = task.subtasks.filter((s) => s.completed).length;
  return `${done}/${task.subtasks.length}`;
}
</script>

<template>
  <div class="table-view">
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th class="th-code" @click="toggleSort('position')">
              <span>Código</span>
              <span class="sort-icon">{{ getSortIndicator('position') }}</span>
            </th>
            <th class="th-title" @click="toggleSort('title')">
              <span>Título de la Tarea</span>
              <span class="sort-icon">{{ getSortIndicator('title') }}</span>
            </th>
            <th class="th-status" @click="toggleSort('status')">
              <span>Estado</span>
              <span class="sort-icon">{{ getSortIndicator('status') }}</span>
            </th>
            <th class="th-priority" @click="toggleSort('priority')">
              <span>Prioridad</span>
              <span class="sort-icon">{{ getSortIndicator('priority') }}</span>
            </th>
            <th class="th-tags">
              <span>Etiquetas</span>
            </th>
            <th class="th-date" @click="toggleSort('dueDate')">
              <span>Vencimiento</span>
              <span class="sort-icon">{{ getSortIndicator('dueDate') }}</span>
            </th>
            <th class="th-subtasks">
              <span>Subtareas</span>
            </th>
            <th class="th-actions"></th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="task in store.filteredTasks"
            :key="task.id"
            class="table-row"
            :class="{ 'is-active': store.selectedTaskId === task.id }"
            @click="store.openTaskDrawer(task.id)"
          >
            <!-- Código -->
            <td class="td-code" @click.stop="store.openTaskDrawer(task.id)">
              <span class="code-badge">{{ task.code }}</span>
            </td>

            <!-- Título con edición en línea -->
            <td class="td-title" @click.stop>
              <div v-if="editingTitleTaskId === task.id" class="inline-edit-wrapper">
                <input
                  v-model="tempTitle"
                  type="text"
                  class="inline-title-input"
                  autofocus
                  @keydown.enter="saveTitle(task)"
                  @keydown.esc="cancelEditingTitle"
                  @blur="saveTitle(task)"
                />
              </div>
              <div v-else class="title-cell-text" @click="startEditingTitle(task)">
                <span>{{ task.title }}</span>
                <span class="edit-hint">✏️</span>
              </div>
            </td>

            <!-- Estado editable en línea -->
            <td class="td-status" @click.stop>
              <select
                :value="task.status"
                class="inline-select status-select"
                :class="`status-${task.status}`"
                @change="handleStatusChange(task, $event)"
              >
                <option value="backlog">📥 Backlog</option>
                <option value="todo">📋 To Do</option>
                <option value="in_progress">⚡ In Progress</option>
                <option value="done">✅ Done</option>
              </select>
            </td>

            <!-- Prioridad editable en línea -->
            <td class="td-priority" @click.stop>
              <select
                :value="task.priority"
                class="inline-select priority-select"
                :class="`priority-${task.priority}`"
                @change="handlePriorityChange(task, $event)"
              >
                <option value="urgent">🔴 Urgente</option>
                <option value="high">🟠 Alta</option>
                <option value="medium">🟡 Media</option>
                <option value="low">⚪ Baja</option>
              </select>
            </td>

            <!-- Etiquetas -->
            <td class="td-tags" @click.stop="store.openTaskDrawer(task.id)">
              <div class="tags-container">
                <span
                  v-for="tag in task.tags"
                  :key="tag.id"
                  class="table-tag-pill"
                  :style="{ borderColor: `${tag.color}50`, color: tag.color, backgroundColor: `${tag.color}15` }"
                >
                  {{ tag.label }}
                </span>
                <span v-if="!task.tags || task.tags.length === 0" class="no-tags">—</span>
              </div>
            </td>

            <!-- Fecha editable en línea -->
            <td class="td-date" @click.stop>
              <input
                type="date"
                class="inline-date-input"
                :value="task.dueDate || ''"
                @change="handleDueDateChange(task, $event)"
              />
            </td>

            <!-- Subtareas -->
            <td class="td-subtasks" @click.stop="store.openTaskDrawer(task.id)">
              <span class="subtask-badge">{{ getSubtaskFraction(task) }}</span>
            </td>

            <!-- Acciones -->
            <td class="td-actions" @click.stop>
              <button
                class="row-delete-btn"
                title="Eliminar tarea"
                @click="store.deleteTask(task.id)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </td>
          </tr>

          <!-- Estado vacío -->
          <tr v-if="store.filteredTasks.length === 0">
            <td colspan="8" class="empty-table-state">
              <div class="empty-content">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <p>No se encontraron tareas con los filtros actuales</p>
                <button
                  class="clear-filters-btn"
                  @click="
                    store.searchQuery = '';
                    store.filterPriority = 'all';
                    store.filterStatus = 'all';
                    store.filterTag = 'all';
                  "
                >
                  Restablecer filtros
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.table-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #0b0f17;
  padding: 16px 20px;
}

.table-container {
  flex: 1;
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(18, 24, 38, 0.45);
}

.table-container::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.table-container::-webkit-scrollbar-track {
  background: transparent;
}
.table-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 4px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;
}

thead {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #111726;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

th {
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  user-select: none;
  cursor: pointer;
  white-space: nowrap;
}

th:hover {
  color: #f1f5f9;
}

.sort-icon {
  margin-left: 5px;
  color: #64748b;
  font-size: 11px;
}

.th-code { width: 90px; }
.th-title { min-width: 260px; }
.th-status { width: 140px; }
.th-priority { width: 130px; }
.th-tags { min-width: 150px; }
.th-date { width: 140px; }
.th-subtasks { width: 90px; }
.th-actions { width: 44px; text-align: center; }

tbody tr {
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.12s ease;
  cursor: pointer;
}

tbody tr:hover {
  background: rgba(255, 255, 255, 0.04);
}

tbody tr.is-active {
  background: rgba(56, 189, 248, 0.1);
}

td {
  padding: 9px 14px;
  color: #e2e8f0;
  vertical-align: middle;
}

.code-badge {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  font-weight: 700;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.1);
  padding: 3px 6px;
  border-radius: 4px;
}

.title-cell-text {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #f8fafc;
  font-weight: 500;
  cursor: text;
}

.edit-hint {
  opacity: 0;
  font-size: 10px;
  transition: opacity 0.15s ease;
}

.title-cell-text:hover .edit-hint {
  opacity: 0.6;
}

.inline-title-input {
  width: 100%;
  background: #0f172a;
  border: 1px solid #38bdf8;
  border-radius: 4px;
  padding: 4px 8px;
  color: #fff;
  font-size: 13px;
  outline: none;
}

.inline-select {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  padding: 4px 8px;
  color: #f1f5f9;
  font-size: 12px;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.inline-select:hover {
  border-color: rgba(255, 255, 255, 0.25);
}

.inline-select:focus {
  border-color: #38bdf8;
}

.status-backlog { color: #94a3b8; }
.status-todo { color: #38bdf8; }
.status-in_progress { color: #f59e0b; }
.status-done { color: #10b981; }

.priority-urgent { color: #f87171; }
.priority-high { color: #fb923c; }
.priority-medium { color: #facc15; }
.priority-low { color: #94a3b8; }

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.table-tag-pill {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid;
}

.no-tags {
  color: #64748b;
  font-size: 11px;
}

.inline-date-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  padding: 3px 6px;
  color: #cbd5e1;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
}

.inline-date-input:focus {
  border-color: #38bdf8;
}

.inline-date-input::-webkit-calendar-picker-indicator {
  filter: invert(0.8);
  cursor: pointer;
}

.subtask-badge {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
}

.row-delete-btn {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  width: 26px;
  height: 26px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.row-delete-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.15);
}

.row-delete-btn svg {
  width: 14px;
  height: 14px;
}

.empty-table-state {
  padding: 40px !important;
  text-align: center;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #64748b;
}

.empty-content svg {
  width: 36px;
  height: 36px;
  stroke: #475569;
}

.empty-content p {
  margin: 0;
  font-size: 13px;
}

.clear-filters-btn {
  margin-top: 6px;
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.clear-filters-btn:hover {
  background: rgba(56, 189, 248, 0.25);
}
</style>
