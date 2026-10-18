import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useOplannerStore, createDefaultDemoProject } from '@/stores/oplannerStore';

describe('useOplannerStore - Suite Oplanner', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('1. Algoritmo de Fractional Indexing (Point-Between)', () => {
    it('calcula el punto medio exacto entre dos posiciones prev y next', () => {
      const store = useOplannerStore();
      const pos = store.calcPositionBetween(1000, 2000);
      expect(pos).toBe(1500);

      const pos2 = store.calcPositionBetween(1000, 1500);
      expect(pos2).toBe(1250);
    });

    it('calcula la posición al insertar al principio de una columna (solo next)', () => {
      const store = useOplannerStore();
      const pos = store.calcPositionBetween(null, 1000);
      expect(pos).toBe(500);
    });

    it('calcula la posición al insertar al final de una columna (solo prev)', () => {
      const store = useOplannerStore();
      const pos = store.calcPositionBetween(2000, null);
      expect(pos).toBe(3000);
    });

    it('calcula la posición inicial para una columna vacía', () => {
      const store = useOplannerStore();
      const pos = store.calcPositionBetween(null, null);
      expect(pos).toBe(1000);
    });

    it('mueve una tarea entre estados y recalcula su posición fraccional', () => {
      const store = useOplannerStore();
      const task = store.currentProject.tasks[0]!;
      const origStatus = task.status;

      store.moveTask(task.id, 'done', 1000, 2000);
      expect(task.status).toBe('done');
      expect(task.position).toBe(1500);
      expect(store.isDirty).toBe(true);
    });
  });

  describe('2. Proyecto Demostrativo por Defecto (Onboarding)', () => {
    it('inicializa el proyecto demostrativo con tareas reales de OogleOS', () => {
      const store = useOplannerStore();
      expect(store.currentProject.name).toBe('OogleOS Architecture & Roadmap');
      expect(store.currentProject.tasks.length).toBeGreaterThanOrEqual(8);

      const sseTask = store.currentProject.tasks.find((t) => t.id === 'task_sse_stream');
      expect(sseTask).toBeDefined();
      expect(sseTask?.title).toContain('stream SSE');
      expect(sseTask?.status).toBe('in_progress');
      expect(sseTask?.priority).toBe('urgent');
      expect(sseTask?.subtasks.length).toBeGreaterThan(0);
    });

    it('inicializa la documentación del proyecto con bloques enriquecidos y task mentions', () => {
      const store = useOplannerStore();
      expect(store.currentProject.docs.length).toBeGreaterThanOrEqual(10);

      const hasH1 = store.currentProject.docs.some((b) => b.type === 'h1');
      const hasCallout = store.currentProject.docs.some((b) => b.type === 'callout');
      const hasCode = store.currentProject.docs.some((b) => b.type === 'code');
      const hasChecklist = store.currentProject.docs.some((b) => b.type === 'checklist');
      const hasTaskMention = store.currentProject.docs.some((b) => b.type === 'task_mention');

      expect(hasH1).toBe(true);
      expect(hasCallout).toBe(true);
      expect(hasCode).toBe(true);
      expect(hasChecklist).toBe(true);
      expect(hasTaskMention).toBe(true);
    });
  });

  describe('3. CRUD de Tareas y Subtareas', () => {
    it('crea una nueva tarea con código incremental', () => {
      const store = useOplannerStore();
      const initialCount = store.currentProject.tasks.length;
      const newTask = store.createTask('todo', {
        title: 'Diseñar interfaz de Oplanner',
        priority: 'high',
      });

      expect(store.currentProject.tasks.length).toBe(initialCount + 1);
      expect(newTask.code).toMatch(/^OOG-\d+$/);
      expect(newTask.title).toBe('Diseñar interfaz de Oplanner');
      expect(newTask.status).toBe('todo');
      expect(store.isDirty).toBe(true);
    });

    it('actualiza los datos de una tarea existente', () => {
      const store = useOplannerStore();
      const task = store.currentProject.tasks[0]!;
      store.updateTask(task.id, { title: 'Título Actualizado', priority: 'urgent' });

      expect(task.title).toBe('Título Actualizado');
      expect(task.priority).toBe('urgent');
      expect(store.isDirty).toBe(true);
    });

    it('elimina una tarea y cierra el drawer si estaba seleccionada', () => {
      const store = useOplannerStore();
      const task = store.currentProject.tasks[0]!;
      store.openTaskDrawer(task.id);
      expect(store.selectedTaskId).toBe(task.id);

      store.deleteTask(task.id);
      expect(store.currentProject.tasks.some((t) => t.id === task.id)).toBe(false);
      expect(store.selectedTaskId).toBeNull();
    });

    it('gestiona subtareas (añadir, toggle, eliminar)', () => {
      const store = useOplannerStore();
      const task = store.currentProject.tasks[0]!;
      const initialSubs = task.subtasks.length;

      store.addSubtask(task.id, 'Verificar integración con Pinia');
      expect(task.subtasks.length).toBe(initialSubs + 1);

      const added = task.subtasks[task.subtasks.length - 1]!;
      expect(added.title).toBe('Verificar integración con Pinia');
      expect(added.completed).toBe(false);

      store.toggleSubtask(task.id, added.id);
      expect(added.completed).toBe(true);

      store.deleteSubtask(task.id, added.id);
      expect(task.subtasks.length).toBe(initialSubs);
    });
  });

  describe('4. CRUD de Bloques de Documentación', () => {
    it('añade y actualiza un bloque de documentación', () => {
      const store = useOplannerStore();
      const newBlock = store.addDocBlock('h2', undefined, 'Nueva Sección de Arquitectura');

      expect(newBlock.type).toBe('h2');
      expect(newBlock.content).toBe('Nueva Sección de Arquitectura');
      expect(store.currentProject.docs.some((b) => b.id === newBlock.id)).toBe(true);

      store.updateDocBlock(newBlock.id, { content: 'Título Modificado' });
      expect(newBlock.content).toBe('Título Modificado');
    });

    it('elimina un bloque de documentación asegurando que quede al menos un bloque', () => {
      const store = useOplannerStore();
      const block = store.currentProject.docs[0]!;
      store.deleteDocBlock(block.id);
      expect(store.currentProject.docs.some((b) => b.id === block.id)).toBe(false);
    });
  });

  describe('5. Filtrado y Búsqueda Reactiva', () => {
    it('filtra tareas por búsqueda de texto (insensible a mayúsculas)', () => {
      const store = useOplannerStore();
      store.searchQuery = 'sse';
      const results = store.filteredTasks;
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((t) => t.title.toLowerCase().includes('sse') || t.description.toLowerCase().includes('sse'))).toBe(true);
    });

    it('filtra tareas por prioridad', () => {
      const store = useOplannerStore();
      store.filterPriority = 'urgent';
      const results = store.filteredTasks;
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((t) => t.priority === 'urgent')).toBe(true);
    });
  });

  describe('6. Serialización y Carga de Archivos .oplanner', () => {
    it('carga un proyecto válido desde formato JSON serializado', () => {
      const store = useOplannerStore();
      const demo = createDefaultDemoProject();
      demo.name = 'Proyecto Importado de Prueba';
      const json = JSON.stringify(demo);

      store.loadProjectFromFile('node-123', 'MiProyecto.oplanner', json);
      expect(store.currentProject.name).toBe('Proyecto Importado de Prueba');
      expect(store.currentFileId).toBe('node-123');
      expect(store.currentFileName).toBe('MiProyecto.oplanner');
      expect(store.isDirty).toBe(false);
    });

    it('importa desde un archivo externo .oplanner', () => {
      const store = useOplannerStore();
      const customProject = {
        id: 'proj_custom',
        version: '1.0.0',
        name: 'Sprint 42',
        description: 'Planificación de sprint',
        updatedAt: new Date().toISOString(),
        tasks: [],
        docs: [],
      };

      const success = store.importFromOplannerFile(JSON.stringify(customProject));
      expect(success).toBe(true);
      expect(store.currentProject.name).toBe('Sprint 42');
      expect(store.isDirty).toBe(true);
    });
  });
});
