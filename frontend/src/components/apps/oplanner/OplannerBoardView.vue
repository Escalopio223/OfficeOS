<script setup lang="ts">
import { ref } from 'vue';
import { useOplannerStore } from '@/stores/oplannerStore';
import type { TaskItem, TaskPriority, TaskStatus } from '@/types/oplanner';

const store = useOplannerStore();

const columns: { id: TaskStatus; label: string; color: string; icon: string }[] = [
  { id: 'backlog', label: 'Backlog', color: '#64748b', icon: '📥' },
  { id: 'todo', label: 'To Do', color: '#38bdf8', icon: '📋' },
  { id: 'in_progress', label: 'In Progress', color: '#f59e0b', icon: '⚡' },
  { id: 'done', label: 'Done', color: '#10b981', icon: '✅' },
];

const draggedTaskId = ref<string | null>(null);
const dragOverCol = ref<TaskStatus | null>(null);
const dragOverTaskId = ref<string | null>(null);
const dragOverPosition = ref<'before' | 'after' | null>(null);

function getPriorityBadge(priority: TaskPriority) {
  switch (priority) {
    case 'urgent':
      return { label: 'Urgente', class: 'priority-urgent', dot: '#ef4444' };
    case 'high':
      return { label: 'Alta', class: 'priority-high', dot: '#f97316' };
    case 'medium':
      return { label: 'Media', class: 'priority-medium', dot: '#eab308' };
    case 'low':
      return { label: 'Baja', class: 'priority-low', dot: '#94a3b8' };
  }
}

function getSubtaskStats(task: TaskItem) {
  if (!task.subtasks || task.subtasks.length === 0) return null;
  const done = task.subtasks.filter((s) => s.completed).length;
  const total = task.subtasks.length;
  const percent = Math.round((done / total) * 100);
  return { done, total, percent };
}

// Drag & Drop nativo con Fractional Indexing
function onDragStart(e: DragEvent, task: TaskItem) {
  draggedTaskId.value = task.id;
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  }
}

function onDragEnd() {
  draggedTaskId.value = null;
  dragOverCol.value = null;
  dragOverTaskId.value = null;
  dragOverPosition.value = null;
}

function onColDragOver(e: DragEvent, status: TaskStatus) {
  e.preventDefault();
  dragOverCol.value = status;
}

function onColDragLeave(e: DragEvent, status: TaskStatus) {
  if (dragOverCol.value === status) {
    dragOverCol.value = null;
  }
}

function onCardDragOver(e: DragEvent, task: TaskItem) {
  e.preventDefault();
  e.stopPropagation();
  if (task.id === draggedTaskId.value) return;

  const targetEl = e.currentTarget as HTMLElement;
  const rect = targetEl.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;

  dragOverTaskId.value = task.id;
  dragOverPosition.value = e.clientY < midY ? 'before' : 'after';
}

function onCardDragLeave(e: DragEvent, task: TaskItem) {
  if (dragOverTaskId.value === task.id) {
    dragOverTaskId.value = null;
    dragOverPosition.value = null;
  }
}

function onCardDrop(e: DragEvent, targetTask: TaskItem, targetStatus: TaskStatus) {
  e.preventDefault();
  e.stopPropagation();
  const id = draggedTaskId.value;
  if (!id || id === targetTask.id) {
    onDragEnd();
    return;
  }

  const tasksInCol = store.boardColumns[targetStatus].filter((t) => t.id !== id);
  const targetIdx = tasksInCol.findIndex((t) => t.id === targetTask.id);

  let prevPos: number | null = null;
  let nextPos: number | null = null;

  if (dragOverPosition.value === 'before') {
    // Se inserta justo antes de targetTask
    nextPos = targetTask.position;
    prevPos = targetIdx > 0 ? (tasksInCol[targetIdx - 1]?.position ?? null) : null;
  } else {
    // Se inserta justo después de targetTask
    prevPos = targetTask.position;
    nextPos = targetIdx < tasksInCol.length - 1 ? (tasksInCol[targetIdx + 1]?.position ?? null) : null;
  }

  store.moveTask(id, targetStatus, prevPos, nextPos);
  onDragEnd();
}

function onColDrop(e: DragEvent, status: TaskStatus) {
  e.preventDefault();
  const id = draggedTaskId.value;
  if (!id) return;

  const tasksInCol = store.boardColumns[status].filter((t) => t.id !== id);
  if (tasksInCol.length === 0) {
    // Columna vacía
    store.moveTask(id, status, null, null);
  } else {
    // Soltado en el fondo de la columna
    const lastTask = tasksInCol[tasksInCol.length - 1];
    store.moveTask(id, status, lastTask?.position ?? null, null);
  }
  onDragEnd();
}

function handleQuickCreate(status: TaskStatus) {
  const newTask = store.createTask(status, {
    title: 'Nueva Tarea',
    priority: 'medium',
  });
  store.openTaskDrawer(newTask.id);
}
</script>

<template>
  <div class="board-view">
    <div class="board-grid">
      <div
        v-for="col in columns"
        :key="col.id"
        class="board-column"
        :class="{ 'is-drag-over': dragOverCol === col.id }"
        @dragover="onColDragOver($event, col.id)"
        @dragleave="onColDragLeave($event, col.id)"
        @drop="onColDrop($event, col.id)"
      >
        <!-- Cabecera de la columna -->
        <header class="column-header">
          <div class="col-title-group">
            <span class="status-indicator" :style="{ backgroundColor: col.color }"></span>
            <span class="col-name">{{ col.label }}</span>
            <span class="col-badge">{{ store.boardColumns[col.id].length }}</span>
          </div>
          <button
            class="col-add-btn"
            title="Crear tarea en esta columna"
            @click="handleQuickCreate(col.id)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </header>

        <!-- Lista de tarjetas de la columna -->
        <div class="column-cards-container">
          <div
            v-for="task in store.boardColumns[col.id]"
            :key="task.id"
            class="task-card"
            :class="{
              'is-dragging': draggedTaskId === task.id,
              'drop-before': dragOverTaskId === task.id && dragOverPosition === 'before',
              'drop-after': dragOverTaskId === task.id && dragOverPosition === 'after',
              'is-active': store.selectedTaskId === task.id,
            }"
            draggable="true"
            @dragstart="onDragStart($event, task)"
            @dragend="onDragEnd"
            @dragover="onCardDragOver($event, task)"
            @dragleave="onCardDragLeave($event, task)"
            @drop="onCardDrop($event, task, col.id)"
            @click="store.openTaskDrawer(task.id)"
          >
            <!-- Cabecera de la tarjeta: ID corto y Prioridad -->
            <div class="card-top">
              <span class="task-code">{{ task.code }}</span>
              <div class="priority-pill" :class="getPriorityBadge(task.priority).class">
                <span class="priority-dot" :style="{ backgroundColor: getPriorityBadge(task.priority).dot }"></span>
                <span class="priority-text">{{ getPriorityBadge(task.priority).label }}</span>
              </div>
            </div>

            <!-- Título de la tarea -->
            <h4 class="card-title">{{ task.title }}</h4>

            <!-- Etiquetas / Tags -->
            <div v-if="task.tags && task.tags.length > 0" class="card-tags">
              <span
                v-for="tag in task.tags"
                :key="tag.id"
                class="tag-pill"
                :style="{ borderColor: `${tag.color}40`, backgroundColor: `${tag.color}15`, color: tag.color }"
              >
                {{ tag.label }}
              </span>
            </div>

            <!-- Pie de tarjeta: Subtareas y Fecha -->
            <div class="card-footer">
              <div v-if="getSubtaskStats(task)" class="subtask-stat" title="Progreso de subtareas">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="stat-icon">
                  <polyline points="9 11 12 14 22 4"></polyline>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                <span class="stat-text">{{ getSubtaskStats(task)?.done }}/{{ getSubtaskStats(task)?.total }}</span>
                <div class="mini-progress-bar">
                  <div
                    class="mini-progress-fill"
                    :style="{ width: `${getSubtaskStats(task)?.percent}%` }"
                  ></div>
                </div>
              </div>

              <div v-if="task.dueDate" class="due-date-badge" title="Fecha de vencimiento">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="date-icon">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>{{ task.dueDate }}</span>
              </div>
            </div>
          </div>

          <!-- Estado vacío por columna -->
          <div
            v-if="store.boardColumns[col.id].length === 0"
            class="empty-column-placeholder"
            @click="handleQuickCreate(col.id)"
          >
            <span>+ Añadir tarea</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.board-view {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 18px 22px;
  background-color: #0b0f17;
  display: flex;
}

.board-grid {
  display: flex;
  gap: 16px;
  min-width: 100%;
  height: 100%;
}

.board-column {
  flex: 1;
  min-width: 270px;
  max-width: 340px;
  background: rgba(18, 24, 38, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.board-column.is-drag-over {
  border-color: rgba(56, 189, 248, 0.5);
  background: rgba(24, 34, 54, 0.75);
}

.column-header {
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(15, 20, 31, 0.8);
}

.col-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.col-name {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
}

.col-badge {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 7px;
  border-radius: 10px;
}

.col-add-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.col-add-btn:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.1);
}

.col-add-btn svg {
  width: 14px;
  height: 14px;
}

.column-cards-container {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.column-cards-container::-webkit-scrollbar {
  width: 5px;
}
.column-cards-container::-webkit-scrollbar-track {
  background: transparent;
}
.column-cards-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 4px;
}

.task-card {
  background: #141b2a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 12px;
  cursor: grab;
  user-select: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: transform 0.12s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  position: relative;
}

.task-card:hover {
  transform: translateY(-2px);
  border-color: rgba(56, 189, 248, 0.35);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
}

.task-card:active {
  cursor: grabbing;
}

.task-card.is-active {
  border-color: #38bdf8;
  background: #192338;
}

.task-card.is-dragging {
  opacity: 0.4;
  transform: scale(0.96);
}

.task-card.drop-before {
  border-top: 2px solid #38bdf8;
}

.task-card.drop-after {
  border-bottom: 2px solid #38bdf8;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.task-code {
  font-size: 11px;
  font-family: ui-monospace, monospace;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.5px;
}

.priority-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.05);
}

.priority-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.priority-urgent {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.priority-high {
  background: rgba(249, 115, 22, 0.15);
  color: #fb923c;
}

.priority-medium {
  background: rgba(234, 179, 8, 0.15);
  color: #facc15;
}

.priority-low {
  background: rgba(148, 163, 184, 0.15);
  color: #cbd5e1;
}

.card-title {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.35;
  color: #f8fafc;
  word-break: break-word;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tag-pill {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.subtask-stat {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #94a3b8;
  font-size: 11px;
}

.stat-icon {
  width: 12px;
  height: 12px;
}

.mini-progress-bar {
  width: 34px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.mini-progress-fill {
  height: 100%;
  background: #38bdf8;
  border-radius: 2px;
}

.due-date-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #94a3b8;
}

.date-icon {
  width: 11px;
  height: 11px;
}

.empty-column-placeholder {
  padding: 16px;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  text-align: center;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.empty-column-placeholder:hover {
  border-color: rgba(56, 189, 248, 0.4);
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.05);
}
</style>
