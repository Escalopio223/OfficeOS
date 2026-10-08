# OogleOS - Simulador de Escritorio Web
Entorno de escritorio virtual en el navegador enfocado en resolver problemas reales de escalabilidad: Virtualización del DOM en cliente, consultas jerárquicas en base de datos e indexación sobre
un volumen de + 100.000 archivos sintéticos y procesamiento en segundo plano desacoplado

**Demo en producción: [ ... ]

**🎯Retos técnicos resueltos:
* **Explorador con más de 100.000 archivos**
  Implementación de **Virtual Scrolling** en Vue 3 (`tanstack/vue-virtual` / `vue-virtual-scroller`). El navegador solo renderiza los elementos visibles en el viewport (Aproximadamente 40 en el DOM)
  evitando así bloqueos de memoria y caídas de frames.

* **Consultas jerárquicas sin recursión infinita:**
  Uso de la extensión nativa `ltree` de PostgreSQL para representar rutas del sistema de archivos (`root.docs.trabajo`). Permite búsquedas de subárboles completos con índices GiST sin el coste de
  consultas recursivas complejas (`WITH RECURSIVE`)

* **Búsqueda difusa en milisegundos:**
  Índices **GIN con `pg-trgm`** en base de datos para filtrado de archivos por nombre en sub-50ms sobre el lote de 100k registros

* **Tareas pesadas en segundo plano (Redis + BullMQ):**
  Cálculo de tamaños de directorios y generación masiva de archivos delegados a colas asíncronas con reintentos automáticos, evitando bloquear el hilo principal de Node.js

* **Gestión de estado desacoplada (WindowManager):**
  Máquina de estados en Pinia para gestionar foco dinámico (`zIndex`), arrastre, minimizado y ciclo de vida de procesos independientes

  ___

  ## Stack tecnológico
____________________________________________________________________________________________
| Capa | Tecnologías |
| :--- | :--- |
| **Frontend** | Vue 3 (Composition API), TypeScript, Pinia, Tailwind CSS, Vite |
| **Backend** | Node.js, Express, TypeScript, Zod, Arquitectura en Capas / Vertical Slices |
| **Persistencia & Caché** | PostgreSQL (Extensiones: `ltree`, `pg_trgm`), Redis |
| **Colas Asíncronas** | BullMQ |
| **Entorno & Despliegue** | Docker, Vercel (Frontend), Render/Railway (API) |






  
