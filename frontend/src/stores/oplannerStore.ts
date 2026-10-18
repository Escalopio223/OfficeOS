import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  TaskItem,
  TaskStatus,
  TaskPriority,
  TaskSubtask,
  TaskTag,
  DocBlock,
  DocBlockType,
  OplannerProject,
  OplannerView,
} from '@/types/oplanner';
import { useFileSystemStore, notifyFilesystemChanged } from '@/stores/filesystem';

const DEFAULT_DEMO_PROJECT_NAME = 'OogleOS Architecture & Roadmap.oplanner';

export function createDefaultDemoProject(): OplannerProject {
  const now = new Date().toISOString();
  return {
    id: 'proj_oogleos_roadmap',
    version: '1.0.0',
    name: 'OogleOS Architecture & Roadmap',
    description: 'Suite integral de planificación, arquitectura técnica y roadmap evolutivo del sistema operativo virtual.',
    updatedAt: now,
    tasks: [
      {
        id: 'task_sse_stream',
        code: 'OOG-01',
        title: 'Implementar stream SSE en Omonitor',
        status: 'in_progress',
        priority: 'urgent',
        tags: [
          { id: 'tag_backend', label: 'Backend', color: '#38bdf8' },
          { id: 'tag_realtime', label: 'Realtime', color: '#f43f5e' },
        ],
        dueDate: '2026-10-25',
        position: 1000,
        description: 'Construir canal unidireccional de baja latencia con Server-Sent Events (`GET /api/system/stream`) para telemetría continua de CPU, memoria del sistema, lag del Event Loop y healthchecks de PostgreSQL y Redis.',
        subtasks: [
          { id: 'sub_1', title: 'Endpoint Fastify GET /api/system/stream con headers keep-alive', completed: true },
          { id: 'sub_2', title: 'Cálculo diferencial delta de CPU usando os.cpus()', completed: true },
          { id: 'sub_3', title: 'Healthcheck reactivo de PostgreSQL (SELECT 1) y Redis PING', completed: true },
          { id: 'sub_4', title: 'Limpieza estricta de intervalos en req.on("close")', completed: true },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task_frac_indexing',
        code: 'OOG-02',
        title: 'Optimización Fractional Indexing en Oplanner',
        status: 'todo',
        priority: 'urgent',
        tags: [
          { id: 'tag_algo', label: 'Algorithm', color: '#a855f7' },
          { id: 'tag_perf', label: 'Performance', color: '#10b981' },
        ],
        dueDate: '2026-10-28',
        position: 1000,
        description: 'Garantizar reordenamiento O(1) de tarjetas Kanban y listas sin reindexar la base de datos completa. Implementar punto medio en coma flotante con rebalanceo automático cuando el margen sea inferior a 1e-6.',
        subtasks: [
          { id: 'sub_frac_1', title: 'Función pura calcPositionBetween(prev, next)', completed: true },
          { id: 'sub_frac_2', title: 'Detección de inserción en cabecera y cola de columna', completed: true },
          { id: 'sub_frac_3', title: 'Rebalanceo preventivo si delta < 0.000001', completed: true },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task_opaint_layers',
        code: 'OOG-03',
        title: 'Motor de capas en Opaint',
        status: 'todo',
        priority: 'high',
        tags: [
          { id: 'tag_frontend', label: 'Frontend', color: '#38bdf8' },
          { id: 'tag_canvas', label: 'Canvas 2D', color: '#eab308' },
        ],
        dueDate: '2026-11-02',
        position: 2000,
        description: 'Soporte de capas transparentes superpuestas con orden Z-index, visibilidad conmutable, opacidad ajustable y mezcla final con composite operation.',
        subtasks: [
          { id: 'sub_paint_1', title: 'Estructura Layer con canvas off-screen independiente', completed: true },
          { id: 'sub_paint_2', title: 'Panel flotante de capas con reordenamiento', completed: false },
          { id: 'sub_paint_3', title: 'Renderizado acelerado a 60 FPS', completed: false },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task_virtual_fs',
        code: 'OOG-04',
        title: 'Sistema de archivos virtual en Oxplorer',
        status: 'in_progress',
        priority: 'high',
        tags: [
          { id: 'tag_core', label: 'Core', color: '#6366f1' },
          { id: 'tag_arch', label: 'Architecture', color: '#ec4899' },
        ],
        dueDate: '2026-10-22',
        position: 2000,
        description: 'Árbol de directorios persistido con PostgreSQL ltree y caché de dos niveles en Redis. Soporte de carpetas seguras cifradas con bcrypt y apertura de archivos específicos por extensión (.oplanner, .opaint, .pdf, .csv, .txt).',
        subtasks: [
          { id: 'sub_fs_1', title: 'Ruta ltree jerárquica y saneamiento de etiquetas', completed: true },
          { id: 'sub_fs_2', title: 'Caché Redis fs:dir:* con invalidación reactiva', completed: true },
          { id: 'sub_fs_3', title: 'Mapeo de extensiones a ventanas de escritorio', completed: true },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task_window_zindex',
        code: 'OOG-05',
        title: 'Arquitectura de ventanas flotantes e indexación Z',
        status: 'done',
        priority: 'medium',
        tags: [
          { id: 'tag_ui', label: 'UI/UX', color: '#14b8a6' },
          { id: 'tag_core', label: 'Core', color: '#6366f1' },
        ],
        dueDate: '2026-10-14',
        position: 1000,
        description: 'Controlador global de ventanas con Pinia. Manejo de foco, elevación de z-index al hacer clic, minimizar/maximizar unificado y barra de tareas reactiva.',
        subtasks: [
          { id: 'sub_win_1', title: 'Composables useWindowBounds para drag y resize', completed: true },
          { id: 'sub_win_2', title: 'Componente WindowControls unificado', completed: true },
          { id: 'sub_win_3', title: 'Persistencia de coordenadas en workspace', completed: true },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task_opdf_viewer',
        code: 'OOG-06',
        title: 'Integración de visor y creador Opdf',
        status: 'done',
        priority: 'medium',
        tags: [
          { id: 'tag_apps', label: 'Apps', color: '#8b5cf6' },
          { id: 'tag_pdf', label: 'PDF', color: '#ef4444' },
        ],
        dueDate: '2026-10-17',
        position: 2000,
        description: 'Visor de documentos PDF nativo con renderizado vectorizado, modo lectura, zoom responsivo y creación directa de PDFs descargables desde el escritorio.',
        subtasks: [
          { id: 'sub_pdf_1', title: 'Previsualización integrada en ventana glass', completed: true },
          { id: 'sub_pdf_2', title: 'Descarga con nombre de archivo personalizado', completed: true },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task_lru_cache',
        code: 'OOG-07',
        title: 'Optimización de Caché LRU para Oxplorer',
        status: 'backlog',
        priority: 'low',
        tags: [
          { id: 'tag_backend', label: 'Backend', color: '#38bdf8' },
          { id: 'tag_perf', label: 'Performance', color: '#10b981' },
        ],
        dueDate: null,
        position: 1000,
        description: 'Estrategia de expulsión de memoria para directorios con más de 10,000 nodos en escenarios de estrés de navegación.',
        subtasks: [
          { id: 'sub_lru_1', title: 'Estructura de cola doblemente enlazada para nodos visitados', completed: false },
          { id: 'sub_lru_2', title: 'Benchmark comparativo con Redis standalone', completed: false },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task_native_notifications',
        code: 'OOG-08',
        title: 'Sistema de Notificaciones Toast Nativas',
        status: 'backlog',
        priority: 'medium',
        tags: [
          { id: 'tag_desktop', label: 'Desktop', color: '#f59e0b' },
          { id: 'tag_ui', label: 'UI/UX', color: '#14b8a6' },
        ],
        dueDate: '2026-11-15',
        position: 2000,
        description: 'Centro de notificaciones contextuales apiladas en la esquina inferior derecha con sonido opcional y persistencia de alertas no leídas.',
        subtasks: [
          { id: 'sub_notif_1', title: 'Store global de alertas push en Pinia', completed: false },
          { id: 'sub_notif_2', title: 'Transiciones de entrada/salida tipo spring', completed: false },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ],
    docs: [
      {
        id: 'doc_1',
        type: 'h1',
        content: 'OogleOS Suite — Especificación Técnica & Arquitectura',
      },
      {
        id: 'doc_2',
        type: 'callout',
        content: 'OogleOS es un sistema operativo virtual en navegador diseñado con Vue 3, Pinia, Fastify/Express, PostgreSQL y Redis, enfocado en rendimiento extremo y diseño estético premium.',
        calloutType: 'info',
      },
      {
        id: 'doc_3',
        type: 'h2',
        content: '1. Modelo de Datos Unificado de Oplanner',
      },
      {
        id: 'doc_4',
        type: 'paragraph',
        content: 'Cada espacio de trabajo de Oplanner se guarda como un único archivo `.oplanner` estructurado en JSON. Este archivo consolida los metadatos del proyecto, la colección de tareas y el documento de especificación en bloques.',
      },
      {
        id: 'doc_5',
        type: 'checklist',
        content: 'Persistencia directa en el sistema de archivos virtual de Oxplorer con extensión .oplanner',
        checked: true,
      },
      {
        id: 'doc_6',
        type: 'checklist',
        content: 'Telemetría de sesión reactiva conectada en tiempo real a Omonitor (files_created, files_opened, files_deleted)',
        checked: true,
      },
      {
        id: 'doc_7',
        type: 'checklist',
        content: 'Reordenamiento O(1) con Fractional Indexing tipo Linear',
        checked: true,
      },
      {
        id: 'doc_8',
        type: 'h2',
        content: '2. Algoritmo de Fractional Indexing (Point-Between)',
      },
      {
        id: 'doc_9',
        type: 'code',
        content: '// Cálculo de posición fraccional al soltar entre tarjetas A y B:\nfunction calcPositionBetween(prev?: number, next?: number): number {\n  if (prev != null && next != null) return (prev + next) / 2;\n  if (next != null) return next / 2;\n  if (prev != null) return prev + 1000;\n  return 1000;\n}',
        language: 'typescript',
      },
      {
        id: 'doc_10',
        type: 'h3',
        content: '3. Tareas Críticas Vinculadas',
      },
      {
        id: 'doc_11',
        type: 'task_mention',
        content: 'Tarea vinculada: Implementar stream SSE en Omonitor',
        taskId: 'task_sse_stream',
      },
      {
        id: 'doc_12',
        type: 'task_mention',
        content: 'Tarea vinculada: Optimización Fractional Indexing en Oplanner',
        taskId: 'task_frac_indexing',
      },
    ],
  };
}

export const useOplannerStore = defineStore('oplanner', () => {
  const fs = useFileSystemStore();

  const currentProject = ref<OplannerProject>(createDefaultDemoProject());
  const activeView = ref<OplannerView>('board');
  const selectedTaskId = ref<string | null>(null);

  // Estado del archivo en el sistema de archivos virtual
  const currentFileId = ref<string | null>(null);
  const currentFileName = ref<string>(DEFAULT_DEMO_PROJECT_NAME);
  const isDirty = ref<boolean>(false);
  const isSaving = ref<boolean>(false);
  const lastSavedAt = ref<Date | null>(null);

  // Filtros y búsqueda
  const searchQuery = ref('');
  const filterPriority = ref<TaskPriority | 'all'>('all');
  const filterStatus = ref<TaskStatus | 'all'>('all');
  const filterTag = ref<string | 'all'>('all');
  const sortBy = ref<'position' | 'priority' | 'dueDate' | 'title' | 'status'>('position');
  const sortOrder = ref<'asc' | 'desc'>('asc');

  // Tarea seleccionada reactiva
  const selectedTask = computed(() => {
    if (!selectedTaskId.value) return null;
    return currentProject.value.tasks.find((t) => t.id === selectedTaskId.value) || null;
  });

  // Lista de tags únicos disponibles en el proyecto
  const availableTags = computed<TaskTag[]>(() => {
    const map = new Map<string, TaskTag>();
    for (const task of currentProject.value.tasks) {
      for (const tag of task.tags) {
        if (!map.has(tag.id)) {
          map.set(tag.id, tag);
        }
      }
    }
    return Array.from(map.values());
  });

  // Contador de tareas por estado
  const statusCounts = computed(() => {
    const counts = { backlog: 0, todo: 0, in_progress: 0, done: 0 };
    for (const task of currentProject.value.tasks) {
      if (counts[task.status] !== undefined) {
        counts[task.status]++;
      }
    }
    return counts;
  });

  // Tareas filtradas y ordenadas
  const filteredTasks = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    const priority = filterPriority.value;
    const status = filterStatus.value;
    const tag = filterTag.value;

    return currentProject.value.tasks
      .filter((task) => {
        if (query) {
          const matchTitle = task.title.toLowerCase().includes(query);
          const matchDesc = task.description.toLowerCase().includes(query);
          const matchCode = task.code.toLowerCase().includes(query);
          if (!matchTitle && !matchDesc && !matchCode) return false;
        }

        if (priority !== 'all' && task.priority !== priority) return false;
        if (status !== 'all' && task.status !== status) return false;
        if (tag !== 'all' && !task.tags.some((t) => t.id === tag || t.label.toLowerCase() === tag.toLowerCase())) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy.value === 'position') {
          cmp = a.position - b.position;
        } else if (sortBy.value === 'priority') {
          const pOrder: Record<TaskPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
          cmp = pOrder[b.priority] - pOrder[a.priority];
        } else if (sortBy.value === 'dueDate') {
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          cmp = dateA - dateB;
        } else if (sortBy.value === 'title') {
          cmp = a.title.localeCompare(b.title);
        } else if (sortBy.value === 'status') {
          const sOrder: Record<TaskStatus, number> = { backlog: 1, todo: 2, in_progress: 3, done: 4 };
          cmp = sOrder[a.status] - sOrder[b.status];
        }

        return sortOrder.value === 'asc' ? cmp : -cmp;
      });
  });

  // Tareas agrupadas por estado para el Kanban (ordenadas por position ascendente)
  const boardColumns = computed(() => {
    const columns: Record<TaskStatus, TaskItem[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      done: [],
    };

    for (const task of filteredTasks.value) {
      if (columns[task.status]) {
        columns[task.status].push(task);
      }
    }

    // Asegurar orden estricto por position
    columns.backlog.sort((a, b) => a.position - b.position);
    columns.todo.sort((a, b) => a.position - b.position);
    columns.in_progress.sort((a, b) => a.position - b.position);
    columns.done.sort((a, b) => a.position - b.position);

    return columns;
  });

  // --- ALGORITMO DE FRACTIONAL INDEXING (POINT-BETWEEN) ---
  function calcPositionBetween(
    prevPosition?: number | null,
    nextPosition?: number | null
  ): number {
    const hasPrev = typeof prevPosition === 'number' && !isNaN(prevPosition);
    const hasNext = typeof nextPosition === 'number' && !isNaN(nextPosition);

    if (hasPrev && hasNext) {
      // Punto medio exacto
      const diff = Math.abs((prevPosition as number) - (nextPosition as number));
      if (diff < 1e-6) {
        // En caso extremo de colisión por coma flotante, devolvemos el punto medio pero indicamos rebalanceo
        return ((prevPosition as number) + (nextPosition as number)) / 2;
      }
      return ((prevPosition as number) + (nextPosition as number)) / 2;
    }

    if (hasNext) {
      // Inserción al inicio de la columna
      const next = nextPosition as number;
      return next <= 0 ? -1000 : next / 2;
    }

    if (hasPrev) {
      // Inserción al final de la columna
      return (prevPosition as number) + 1000;
    }

    // Columna vacía
    return 1000;
  }

  // Rebalanceo de seguridad para evitar desbordamiento de precisión IEEE 754
  function rebalanceColumn(status: TaskStatus) {
    const tasksInCol = currentProject.value.tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.position - b.position);

    let base = 1000;
    for (const task of tasksInCol) {
      task.position = base;
      base += 1000;
    }
  }

  // Generador de código incremental (ej. OOG-09)
  function generateNextTaskCode(): string {
    let maxNum = 0;
    for (const task of currentProject.value.tasks) {
      const match = task.code.match(/OOG-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const next = maxNum + 1;
    return `OOG-${next < 10 ? '0' + next : next}`;
  }

  // --- CRUD DE TAREAS ---
  function createTask(
    status: TaskStatus = 'todo',
    partial: Partial<TaskItem> = {}
  ): TaskItem {
    const now = new Date().toISOString();
    const tasksInStatus = currentProject.value.tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.position - b.position);

    const lastTask = tasksInStatus[tasksInStatus.length - 1];
    const newPosition = calcPositionBetween(lastTask?.position, null);

    const newTask: TaskItem = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      code: generateNextTaskCode(),
      title: partial.title || 'Nueva Tarea',
      status,
      priority: partial.priority || 'medium',
      tags: partial.tags || [{ id: 'tag_general', label: 'General', color: '#64748b' }],
      dueDate: partial.dueDate || null,
      position: newPosition,
      description: partial.description || '',
      subtasks: partial.subtasks || [],
      createdAt: now,
      updatedAt: now,
    };

    currentProject.value.tasks.push(newTask);
    markDirty();
    return newTask;
  }

  function updateTask(taskId: string, updates: Partial<TaskItem>) {
    const task = currentProject.value.tasks.find((t) => t.id === taskId);
    if (!task) return;

    Object.assign(task, updates);
    task.updatedAt = new Date().toISOString();
    markDirty();
  }

  function deleteTask(taskId: string) {
    const index = currentProject.value.tasks.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      currentProject.value.tasks.splice(index, 1);
      if (selectedTaskId.value === taskId) {
        selectedTaskId.value = null;
      }
      markDirty();
    }
  }

  // Mover tarea entre columnas o dentro de la misma columna con Fractional Indexing
  function moveTask(
    taskId: string,
    targetStatus: TaskStatus,
    prevPosition?: number | null,
    nextPosition?: number | null
  ) {
    const task = currentProject.value.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const oldStatus = task.status;
    const newPos = calcPositionBetween(prevPosition, nextPosition);

    task.status = targetStatus;
    task.position = newPos;
    task.updatedAt = new Date().toISOString();

    // Comprobación de rebalanceo si la distancia es microscópica
    if (
      prevPosition != null &&
      nextPosition != null &&
      Math.abs(prevPosition - nextPosition) < 1e-4
    ) {
      rebalanceColumn(targetStatus);
    }

    markDirty();
  }

  // --- SUBTAREAS ---
  function addSubtask(taskId: string, title: string) {
    if (!title.trim()) return;
    const task = currentProject.value.tasks.find((t) => t.id === taskId);
    if (!task) return;

    task.subtasks.push({
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      completed: false,
    });
    task.updatedAt = new Date().toISOString();
    markDirty();
  }

  function toggleSubtask(taskId: string, subtaskId: string) {
    const task = currentProject.value.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const sub = task.subtasks.find((s) => s.id === subtaskId);
    if (sub) {
      sub.completed = !sub.completed;
      task.updatedAt = new Date().toISOString();
      markDirty();
    }
  }

  function deleteSubtask(taskId: string, subtaskId: string) {
    const task = currentProject.value.tasks.find((t) => t.id === taskId);
    if (!task) return;

    task.subtasks = task.subtasks.filter((s) => s.id !== subtaskId);
    task.updatedAt = new Date().toISOString();
    markDirty();
  }

  // --- BLOQUES DE DOCUMENTACIÓN (/ SLASH COMMANDS) ---
  function addDocBlock(
    type: DocBlockType = 'paragraph',
    afterBlockId?: string,
    content: string = ''
  ): DocBlock {
    const newBlock: DocBlock = {
      id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      content,
      checked: type === 'checklist' ? false : undefined,
      language: type === 'code' ? 'typescript' : undefined,
      calloutType: type === 'callout' ? 'info' : undefined,
    };

    if (afterBlockId) {
      const idx = currentProject.value.docs.findIndex((b) => b.id === afterBlockId);
      if (idx !== -1) {
        currentProject.value.docs.splice(idx + 1, 0, newBlock);
        markDirty();
        return newBlock;
      }
    }

    currentProject.value.docs.push(newBlock);
    markDirty();
    return newBlock;
  }

  function updateDocBlock(blockId: string, updates: Partial<DocBlock>) {
    const block = currentProject.value.docs.find((b) => b.id === blockId);
    if (!block) return;

    Object.assign(block, updates);
    markDirty();
  }

  function deleteDocBlock(blockId: string) {
    const index = currentProject.value.docs.findIndex((b) => b.id === blockId);
    if (index !== -1) {
      currentProject.value.docs.splice(index, 1);
      // Garantizar que siempre haya al menos un bloque
      if (currentProject.value.docs.length === 0) {
        currentProject.value.docs.push({
          id: `block_${Date.now()}`,
          type: 'paragraph',
          content: '',
        });
      }
      markDirty();
    }
  }

  function moveDocBlock(fromIndex: number, toIndex: number) {
    if (fromIndex < 0 || fromIndex >= currentProject.value.docs.length) return;
    if (toIndex < 0 || toIndex >= currentProject.value.docs.length) return;

    const [moved] = currentProject.value.docs.splice(fromIndex, 1);
    if (moved) {
      currentProject.value.docs.splice(toIndex, 0, moved);
      markDirty();
    }
  }

  // --- GESTIÓN DE GUARDADO Y FICHEROS ---
  function markDirty() {
    isDirty.value = true;
    currentProject.value.updatedAt = new Date().toISOString();
  }

  function openTaskDrawer(taskId: string) {
    selectedTaskId.value = taskId;
  }

  function closeTaskDrawer() {
    selectedTaskId.value = null;
  }

  // Carga desde archivo virtual .oplanner
  function loadProjectFromFile(fileId: string, fileName: string, contentStr: string) {
    try {
      if (!contentStr || !contentStr.trim()) {
        // Archivo nuevo en blanco
        currentProject.value = {
          id: `proj_${Date.now()}`,
          version: '1.0.0',
          name: fileName.replace(/\.oplanner$/i, ''),
          description: 'Espacio de trabajo creado en OogleOS',
          updatedAt: new Date().toISOString(),
          tasks: [],
          docs: [
            { id: 'b_1', type: 'h1', content: fileName.replace(/\.oplanner$/i, '') },
            { id: 'b_2', type: 'paragraph', content: 'Comienza a redactar o presiona "/" para insertar bloques...' },
          ],
        };
      } else {
        const parsed: OplannerProject = JSON.parse(contentStr);
        if (!parsed.tasks || !Array.isArray(parsed.tasks)) parsed.tasks = [];
        if (!parsed.docs || !Array.isArray(parsed.docs)) parsed.docs = [];
        currentProject.value = parsed;
      }

      currentFileId.value = fileId;
      currentFileName.value = fileName;
      isDirty.value = false;
      lastSavedAt.value = new Date();

      // Notificar a telemetría
      fs.notifyFileOpened(fileName);
    } catch (err) {
      console.error('Error al parsear archivo .oplanner:', err);
    }
  }

  // Guardar proyecto actual en Oxplorer / Virtual FS
  async function saveToVirtualFs(customName?: string): Promise<{ success: boolean; error?: string }> {
    isSaving.value = true;
    try {
      const serialized = JSON.stringify(currentProject.value, null, 2);
      let targetName = (customName || currentFileName.value || 'Mi Proyecto.oplanner').trim();
      if (!targetName.toLowerCase().endsWith('.oplanner')) {
        targetName += '.oplanner';
      }

      if (currentFileId.value) {
        // Actualizar archivo existente
        const res = await fetch(`/api/nodes/${currentFileId.value}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: serialized,
            name: targetName,
          }),
        });

        if (!res.ok) {
          throw new Error('Error al actualizar el archivo en el sistema de archivos');
        }

        currentFileName.value = targetName;
      } else {
        // Crear nuevo archivo en root.desktop
        const res = await fetch('/api/nodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: targetName,
            is_directory: false,
            content: serialized,
            parentPath: 'root.desktop',
            mime_type: 'application/json',
          }),
        });

        if (!res.ok) {
          throw new Error('Error al crear el archivo .oplanner en el escritorio');
        }

        const created = await res.json();
        currentFileId.value = created.id;
        currentFileName.value = targetName;
      }

      isDirty.value = false;
      lastSavedAt.value = new Date();
      notifyFilesystemChanged();
      return { success: true };
    } catch (err: any) {
      console.error('Error guardando proyecto Oplanner:', err);
      return { success: false, error: err.message || 'Error desconocido' };
    } finally {
      isSaving.value = false;
    }
  }

  // Exportar archivo .oplanner al sistema anfitrión
  function exportAsOplanner() {
    const serialized = JSON.stringify(currentProject.value, null, 2);
    const blob = new Blob([serialized], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    let name = currentFileName.value || `${currentProject.value.name}.oplanner`;
    if (!name.endsWith('.oplanner')) name += '.oplanner';
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Exportar como Markdown estructurado
  function exportAsMarkdown() {
    let md = `# ${currentProject.value.name}\n\n`;
    md += `${currentProject.value.description}\n\n`;
    md += `---\n\n`;
    md += `## 📋 Tareas del Proyecto\n\n`;

    const statuses: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'done'];
    const statusTitles: Record<TaskStatus, string> = {
      backlog: 'Backlog',
      todo: 'To Do',
      in_progress: 'In Progress',
      done: 'Done',
    };

    for (const st of statuses) {
      const inStatus = currentProject.value.tasks.filter((t) => t.status === st);
      md += `### ${statusTitles[st]} (${inStatus.length})\n\n`;
      for (const t of inStatus) {
        md += `- **[${t.code}] ${t.title}** (Prioridad: ${t.priority.toUpperCase()})\n`;
        if (t.description) md += `  - ${t.description}\n`;
        if (t.subtasks && t.subtasks.length > 0) {
          for (const s of t.subtasks) {
            md += `    - [${s.completed ? 'x' : ' '}] ${s.title}\n`;
          }
        }
      }
      md += `\n`;
    }

    md += `---\n\n`;
    md += `## 📄 Especificaciones & Documentación\n\n`;

    for (const b of currentProject.value.docs) {
      if (b.type === 'h1') md += `# ${b.content}\n\n`;
      else if (b.type === 'h2') md += `## ${b.content}\n\n`;
      else if (b.type === 'h3') md += `### ${b.content}\n\n`;
      else if (b.type === 'paragraph') md += `${b.content}\n\n`;
      else if (b.type === 'checklist') md += `- [${b.checked ? 'x' : ' '}] ${b.content}\n`;
      else if (b.type === 'code') md += `\`\`\`${b.language || ''}\n${b.content}\n\`\`\`\n\n`;
      else if (b.type === 'callout') md += `> 💡 **Nota:** ${b.content}\n\n`;
      else if (b.type === 'task_mention') md += `> 📌 *Mención a Tarea:* ${b.content}\n\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentProject.value.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Importar desde archivo .oplanner externo
  function importFromOplannerFile(fileContent: string): boolean {
    try {
      const parsed: OplannerProject = JSON.parse(fileContent);
      if (!parsed.name || !Array.isArray(parsed.tasks)) {
        throw new Error('Estructura de proyecto .oplanner inválida');
      }
      currentProject.value = parsed;
      currentFileId.value = null;
      currentFileName.value = `${parsed.name}.oplanner`;
      isDirty.value = true;
      return true;
    } catch (err) {
      console.error('Error al importar archivo .oplanner:', err);
      return false;
    }
  }

  // Restaurar proyecto demostrativo por defecto
  function resetToDemo() {
    currentProject.value = createDefaultDemoProject();
    currentFileId.value = null;
    currentFileName.value = DEFAULT_DEMO_PROJECT_NAME;
    isDirty.value = false;
    lastSavedAt.value = new Date();
  }

  return {
    currentProject,
    activeView,
    selectedTaskId,
    selectedTask,
    currentFileId,
    currentFileName,
    isDirty,
    isSaving,
    lastSavedAt,
    searchQuery,
    filterPriority,
    filterStatus,
    filterTag,
    sortBy,
    sortOrder,
    availableTags,
    statusCounts,
    filteredTasks,
    boardColumns,
    calcPositionBetween,
    rebalanceColumn,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    addDocBlock,
    updateDocBlock,
    deleteDocBlock,
    moveDocBlock,
    openTaskDrawer,
    closeTaskDrawer,
    loadProjectFromFile,
    saveToVirtualFs,
    exportAsOplanner,
    exportAsMarkdown,
    importFromOplannerFile,
    resetToDemo,
  };
});
