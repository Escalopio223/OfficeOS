<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useOplannerStore } from '@/stores/oplannerStore';
import type { TaskPriority, TaskStatus, TaskTag } from '@/types/oplanner';

const store = useOplannerStore();

const task = computed(() => store.selectedTask);

const newSubtaskTitle = ref('');
const newTagLabel = ref('');
const newTagColor = ref('#38bdf8');
const showAddTagInput = ref(false);

const subtaskStats = computed(() => {
  if (!task.value?.subtasks || task.value.subtasks.length === 0) return { done: 0, total: 0, percent: 0 };
  const done = task.value.subtasks.filter((s) => s.completed).length;
  const total = task.value.subtasks.length;
  return { done, total, percent: Math.round((done / total) * 100) };
});

function handleTitleChange(e: Event) {
  if (!task.value) return;
  const target = e.target as HTMLInputElement;
  store.updateTask(task.value.id, { title: target.value });
}

function handleDescriptionChange(e: Event) {
  if (!task.value) return;
  const target = e.target as HTMLTextAreaElement;
  store.updateTask(task.value.id, { description: target.value });
}

function handleStatusChange(status: TaskStatus) {
  if (!task.value) return;
  store.updateTask(task.value.id, { status });
}

function handlePriorityChange(priority: TaskPriority) {
  if (!task.value) return;
  store.updateTask(task.value.id, { priority });
}

function handleDueDateChange(e: Event) {
  if (!task.value) return;
  const target = e.target as HTMLInputElement;
  store.updateTask(task.value.id, { dueDate: target.value || null });
}

function handleAddSubtask() {
  if (!task.value || !newSubtaskTitle.value.trim()) return;
  store.addSubtask(task.value.id, newSubtaskTitle.value.trim());
  newSubtaskTitle.value = '';
}

function handleAddTag() {
  if (!task.value || !newTagLabel.value.trim()) return;
  const newTag: TaskTag = {
    id: `tag_${Date.now()}`,
    label: newTagLabel.value.trim(),
    color: newTagColor.value,
  };
  const updated = [...task.value.tags, newTag];
  store.updateTask(task.value.id, { tags: updated });
  newTagLabel.value = '';
  showAddTagInput.value = false;
}

function handleRemoveTag(tagId: string) {
  if (!task.value) return;
  const updated = task.value.tags.filter((t) => t.id !== tagId);
  store.updateTask(task.value.id, { tags: updated });
}

function handleDeleteTask() {
  if (!task.value) return;
  store.deleteTask(task.value.id);
}
</script>

<template>
  <div v-if="task" class="drawer-overlay" @click="store.closeTaskDrawer">
    <aside class="task-drawer" @click.stop>
      <!-- Cabecera del Drawer -->
      <header class="drawer-header">
        <div class="header-left">
          <span class="drawer-task-code">{{ task.code }}</span>
          <span
            class="drawer-status-pill"
            :class="`status-${task.status}`"
          >
            {{ task.status.toUpperCase() }}
          </span>
        </div>
        <div class="header-right">
          <button class="drawer-action-btn delete-btn" title="Eliminar tarea" @click="handleDeleteTask">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
          <button class="drawer-action-btn close-btn" title="Cerrar panel" @click="store.closeTaskDrawer">
            ✕
          </button>
        </div>
      </header>

      <!-- Contenido scrolleable -->
      <div class="drawer-body">
        <!-- Título editable -->
        <div class="title-section">
          <input
            :value="task.title"
            type="text"
            class="task-title-input"
            placeholder="Título de la tarea..."
            @input="handleTitleChange"
          />
        </div>

        <!-- Propiedades del Task (Metadatos estilo Linear) -->
        <div class="properties-grid">
          <!-- Estado -->
          <div class="property-row">
            <span class="prop-label">Estado</span>
            <div class="prop-value">
              <select
                :value="task.status"
                class="prop-select"
                :class="`status-${task.status}`"
                @change="handleStatusChange(($event.target as HTMLSelectElement).value as TaskStatus)"
              >
                <option value="backlog">📥 Backlog</option>
                <option value="todo">📋 To Do</option>
                <option value="in_progress">⚡ In Progress</option>
                <option value="done">✅ Done</option>
              </select>
            </div>
          </div>

          <!-- Prioridad -->
          <div class="property-row">
            <span class="prop-label">Prioridad</span>
            <div class="prop-value">
              <select
                :value="task.priority"
                class="prop-select"
                :class="`priority-${task.priority}`"
                @change="handlePriorityChange(($event.target as HTMLSelectElement).value as TaskPriority)"
              >
                <option value="urgent">🔴 Urgente</option>
                <option value="high">🟠 Alta</option>
                <option value="medium">🟡 Media</option>
                <option value="low">⚪ Baja</option>
              </select>
            </div>
          </div>

          <!-- Fecha de Vencimiento -->
          <div class="property-row">
            <span class="prop-label">Fecha</span>
            <div class="prop-value">
              <input
                type="date"
                class="prop-date-input"
                :value="task.dueDate || ''"
                @change="handleDueDateChange"
              />
            </div>
          </div>

          <!-- Etiquetas -->
          <div class="property-row tags-row">
            <span class="prop-label">Etiquetas</span>
            <div class="prop-value tags-wrap">
              <span
                v-for="tag in task.tags"
                :key="tag.id"
                class="drawer-tag"
                :style="{ borderColor: `${tag.color}60`, color: tag.color, backgroundColor: `${tag.color}15` }"
              >
                {{ tag.label }}
                <button class="remove-tag-btn" @click.stop="handleRemoveTag(tag.id)">✕</button>
              </span>

              <!-- Añadir tag -->
              <div v-if="showAddTagInput" class="new-tag-input-group">
                <input
                  v-model="newTagLabel"
                  type="text"
                  placeholder="Etiqueta..."
                  class="new-tag-input"
                  @keydown.enter="handleAddTag"
                  @keydown.esc="showAddTagInput = false"
                />
                <input
                  v-model="newTagColor"
                  type="color"
                  class="new-tag-color-picker"
                />
                <button class="save-tag-btn" @click="handleAddTag">✓</button>
              </div>
              <button
                v-else
                class="add-tag-trigger"
                @click="showAddTagInput = true"
              >
                + Etiqueta
              </button>
            </div>
          </div>
        </div>

        <div class="drawer-divider"></div>

        <!-- Descripción enriquecida / Markdown -->
        <div class="description-section">
          <label class="section-label">Descripción & Especificación</label>
          <textarea
            :value="task.description"
            class="description-textarea"
            placeholder="Añade una descripción detallada, contexto técnico, links o instrucciones..."
            rows="6"
            @input="handleDescriptionChange"
          ></textarea>
        </div>

        <div class="drawer-divider"></div>

        <!-- Checklist de Subtareas -->
        <div class="subtasks-section">
          <div class="subtasks-header">
            <label class="section-label">
              Subtareas ({{ subtaskStats.done }}/{{ subtaskStats.total }})
            </label>
            <span class="subtasks-percent">{{ subtaskStats.percent }}% completado</span>
          </div>

          <!-- Barra de progreso -->
          <div class="drawer-progress-track">
            <div
              class="drawer-progress-fill"
              :style="{ width: `${subtaskStats.percent}%` }"
            ></div>
          </div>

          <!-- Lista de subtareas -->
          <div class="subtasks-list">
            <div
              v-for="sub in task.subtasks"
              :key="sub.id"
              class="subtask-row"
            >
              <input
                type="checkbox"
                class="subtask-checkbox"
                :checked="sub.completed"
                @change="store.toggleSubtask(task.id, sub.id)"
              />
              <span
                class="subtask-title"
                :class="{ 'is-completed': sub.completed }"
              >
                {{ sub.title }}
              </span>
              <button
                class="subtask-del-btn"
                title="Eliminar subtarea"
                @click="store.deleteSubtask(task.id, sub.id)"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Input para nueva subtarea -->
          <div class="add-subtask-box">
            <input
              v-model="newSubtaskTitle"
              type="text"
              class="add-subtask-input"
              placeholder="+ Añadir subtarea (pulsa Enter)..."
              @keydown.enter="handleAddSubtask"
            />
            <button
              v-if="newSubtaskTitle.trim()"
              class="add-subtask-btn"
              @click="handleAddSubtask"
            >
              Añadir
            </button>
          </div>
        </div>
      </div>

      <!-- Footer con estado de autoguardado -->
      <footer class="drawer-footer">
        <div class="save-status-info">
          <span class="save-indicator-dot" :class="{ 'is-dirty': store.isDirty }"></span>
          <span class="save-indicator-text">
            {{ store.isDirty ? 'Cambios sin guardar' : 'Guardado en Oxplorer' }}
          </span>
          <span class="shortcut-tip">Ctrl+S para guardar</span>
        </div>
      </footer>
    </aside>
  </div>
</template>

<style scoped>
.drawer-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: flex-end;
  z-index: 40;
  backdrop-filter: blur(2px);
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.task-drawer {
  width: 460px;
  max-width: 90%;
  height: 100%;
  background: #0f1726;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: -10px 0 35px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.drawer-header {
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(18, 24, 38, 0.7);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.drawer-task-code {
  font-family: ui-monospace, monospace;
  font-size: 13px;
  font-weight: 700;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.12);
  padding: 3px 8px;
  border-radius: 4px;
}

.drawer-status-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
}

.drawer-status-pill.status-backlog { background: rgba(148, 163, 184, 0.15); color: #cbd5e1; }
.drawer-status-pill.status-todo { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
.drawer-status-pill.status-in_progress { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.drawer-status-pill.status-done { background: rgba(16, 185, 129, 0.15); color: #10b981; }

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawer-action-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.drawer-action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
}

.drawer-action-btn.delete-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.drawer-action-btn svg {
  width: 15px;
  height: 15px;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.drawer-body::-webkit-scrollbar {
  width: 5px;
}
.drawer-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 4px;
}

.task-title-input {
  width: 100%;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 18px;
  font-weight: 600;
  color: #f8fafc;
  outline: none;
  transition: border-color 0.15s ease;
}

.task-title-input:hover,
.task-title-input:focus {
  border-color: rgba(56, 189, 248, 0.4);
  background: rgba(255, 255, 255, 0.03);
}

.properties-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px 14px;
}

.property-row {
  display: flex;
  align-items: center;
}

.prop-label {
  width: 90px;
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.prop-value {
  flex: 1;
}

.prop-select {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  padding: 4px 8px;
  color: #f1f5f9;
  font-size: 12px;
  font-weight: 500;
  outline: none;
  cursor: pointer;
}

.prop-date-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  padding: 4px 8px;
  color: #cbd5e1;
  font-size: 12px;
  outline: none;
  cursor: pointer;
}

.prop-date-input::-webkit-calendar-picker-indicator {
  filter: invert(0.8);
  cursor: pointer;
}

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.drawer-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid;
}

.remove-tag-btn {
  background: transparent;
  border: none;
  color: inherit;
  font-size: 10px;
  cursor: pointer;
  padding: 0;
  opacity: 0.7;
}

.remove-tag-btn:hover {
  opacity: 1;
}

.add-tag-trigger {
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  color: #94a3b8;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-tag-trigger:hover {
  color: #38bdf8;
  border-color: #38bdf8;
}

.new-tag-input-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.new-tag-input {
  background: #0f172a;
  border: 1px solid #38bdf8;
  border-radius: 4px;
  padding: 2px 6px;
  color: #fff;
  font-size: 11px;
  width: 90px;
  outline: none;
}

.new-tag-color-picker {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  background: transparent;
}

.save-tag-btn {
  background: #38bdf8;
  color: #0b0f17;
  border: none;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
}

.drawer-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 8px;
}

.description-textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 10px 12px;
  color: #e2e8f0;
  font-size: 13px;
  line-height: 1.5;
  outline: none;
  resize: vertical;
  transition: border-color 0.15s ease;
}

.description-textarea:focus {
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.02);
}

.subtasks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.subtasks-percent {
  font-size: 11px;
  color: #38bdf8;
  font-weight: 600;
}

.drawer-progress-track {
  width: 100%;
  height: 5px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 12px;
}

.drawer-progress-fill {
  height: 100%;
  background: #38bdf8;
  transition: width 0.2s ease;
}

.subtasks-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.subtask-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.02);
  transition: background 0.12s ease;
}

.subtask-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.subtask-checkbox {
  width: 15px;
  height: 15px;
  accent-color: #38bdf8;
  cursor: pointer;
}

.subtask-title {
  flex: 1;
  font-size: 13px;
  color: #e2e8f0;
}

.subtask-title.is-completed {
  text-decoration: line-through;
  color: #64748b;
}

.subtask-del-btn {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 11px;
  padding: 2px 4px;
  border-radius: 3px;
}

.subtask-del-btn:hover {
  color: #ef4444;
}

.add-subtask-box {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.add-subtask-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 7px 10px;
  color: #f1f5f9;
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s ease;
}

.add-subtask-input:focus {
  border-color: #38bdf8;
}

.add-subtask-btn {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 6px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-subtask-btn:hover {
  background: rgba(56, 189, 248, 0.25);
}

.drawer-footer {
  padding: 12px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(18, 24, 38, 0.7);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.save-status-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #94a3b8;
}

.save-indicator-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
}

.save-indicator-dot.is-dirty {
  background: #f59e0b;
}

.shortcut-tip {
  color: #64748b;
  margin-left: 8px;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}
</style>
