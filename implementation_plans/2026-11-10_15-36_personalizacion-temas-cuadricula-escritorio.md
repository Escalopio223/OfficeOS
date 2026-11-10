# Plan de Implementación: Personalización del Sistema (Temas, Barra de Tareas, Fondos, Tipografías) y Cuadrícula de Escritorio Estilo Windows

**Fecha y hora:** 2026-11-10 15:36  
**Rama de trabajo:** `feature/customization`  
**Autor:** Agente Antigravity / OfficeOS Team

---

## 1. Objetivo de la tarea

Dotar a OfficeOS de un sistema integral de personalización visual persistente en `localStorage` y transformar el comportamiento del escritorio para que los iconos y accesos directos se organicen y ajusten estrictamente mediante una cuadrícula (Snap to Grid) idéntica a la experiencia de usuario de Windows:

1. **Color de la barra de tareas:** Permitir cambiar el color de fondo de la barra de tareas con una paleta de colores predefinidos elegantes y un selector de color personalizado RGB/HEX.
2. **Tema Claro y Tema Oscuro:** Soporte completo para alternar entre tema oscuro (predeterminado) y tema claro, adaptando la barra de tareas, los menús contextuales, las cabeceras de ventanas, el menú inicio y los textos de iconos del escritorio con alto contraste.
3. **Fondos de pantalla precargados:** Ofrecer un catálogo integrado de fondos de pantalla de alta resolución y gradientes vectoriales modernos sin requerir subida de archivos externos.
4. **Tipografía del sistema:** Permitir seleccionar entre un conjunto de tipografías seguras para la web (Sistema / Segoe UI, Inter moderna, Monospace / Consolas, Georgia Serif, Amigable / Trebuchet).
5. **Cuadrícula de escritorio estilo Windows:** Eliminar el movimiento libre a coordenadas flotantes/arbitrarias. Los iconos del escritorio (tanto aplicaciones del sistema como notas y carpetas del usuario) se ajustarán a celdas discretas de cuadrícula (`GRID_CELL_WIDTH` x `GRID_CELL_HEIGHT`) con indicador visual durante el arrastre y detección inteligente de celda libre adyacente para evitar solapamientos.
6. **Ventana de Personalización dedicada (`CustomizationWindow.vue`):** Accesible desde el menú contextual del escritorio ("Personalizar"), el menú contextual de la barra de tareas y el Menú de Inicio.

---

## 2. Lista exacta de archivos a crear, modificar o eliminar

### Archivos a crear:
- `frontend/src/stores/customizationStore.ts`: Store de Pinia para almacenar y persistir en `localStorage` el color de la taskbar, tema claro/oscuro, fondo de pantalla activo, tipografía y opciones de cuadrícula.
- `frontend/src/components/apps/customization/CustomizationWindow.vue`: Ventana de configuración de personalización con pestañas interactivas para Barra de tareas, Tema, Fondos de pantalla, Tipografía y Cuadrícula.
- `frontend/src/assets/customization.svg`: Icono vectorial para la aplicación de Personalización del sistema.
- `frontend/src/__tests__/customization.spec.ts`: Pruebas unitarias para el store de personalización y lógica de cuadrícula.

### Archivos a modificar:
- `frontend/src/stores/windowStore.ts`: Registrar la ventana `customization` en el mapa de ventanas permitidas (`WindowId` y estado inicial).
- `frontend/src/components/desktop/DesktopWorkspace.vue`:
  - Implementar lógica de cuadrícula estricta (`GRID_CELL_WIDTH = 92`, `GRID_CELL_HEIGHT = 96`, `GRID_OFFSET_X = 20`, `GRID_OFFSET_Y = 20`).
  - Añadir indicador visual de celda objetivo (hover grid ghost).
  - Aplicar el fondo de pantalla reactivo seleccionado en el store.
  - Integrar opción "🎨 Personalizar" en el menú contextual del escritorio.
  - Renderizar `<CustomizationWindow>` cuando esté activa.
- `frontend/src/components/desktop/Taskbar.vue`:
  - Conectar el color de fondo a la variable/propiedad de `customizationStore`.
  - Añadir botón de acceso rápido para alternar Tema Claro/Oscuro en la bandeja del sistema.
  - Añadir opción "🎨 Personalizar barra de tareas" en el menú contextual de la barra.
- `frontend/src/components/desktop/StartMenu.vue`:
  - Agregar la aplicación "Personalización" a la cuadrícula de aplicaciones del menú de inicio.
- `frontend/src/App.vue`:
  - Enlazar la clase del tema (`theme-dark` / `theme-light`) y el estilo tipográfico dinámico en la raíz del sistema.
  - Declarar las variables CSS globales para el tema claro y oscuro.

### Archivos a eliminar:
- Ninguno.

---

## 3. Cambios en base de datos, endpoints o estado (Pinia)

### Estado de Pinia (`customizationStore.ts`):
```typescript
interface CustomizationState {
  taskbarColor: string;          // p. ej. '#11111b'
  theme: 'dark' | 'light';       // 'dark' | 'light'
  wallpaperId: string;           // 'oogle' | 'nebula' | 'cyberpunk' | 'aurora' | 'sunset' | 'slate' | 'solar' | 'forest'
  fontFamilyId: string;          // 'system' | 'inter' | 'monospace' | 'serif' | 'friendly'
  gridSnap: boolean;             // true
}
```
- **Persistencia:** Automática a través de `localStorage.getItem('officeos_customization')` y `localStorage.setItem(...)`.
- **Valores por defecto:**
  - `taskbarColor`: `'#11111b'`
  - `theme`: `'dark'`
  - `wallpaperId`: `'oogle'`
  - `fontFamilyId`: `'system'`
  - `gridSnap`: `true`

---

## 4. Pasos secuenciales de ejecución

1. **Creación del Store de Personalización (`customizationStore.ts`):**
   - Definir los catálogos de fondos precargados (gradientes artísticos modernos y el clásico Oogle).
   - Definir la paleta de colores para la barra de tareas y el mapeo de fuentes tipográficas web seguras.
   - Implementar métodos reactivos para actualizar y guardar preferencias.
   - Proporcionar estilos CSS computados para inyección en componentes.

2. **Registro de la ventana en `windowStore.ts`:**
   - Añadir `'customization'` al tipo `WindowId`.
   - Inicializar el estado de la ventana en `windows` con título "Personalización".

3. **Creación de `CustomizationWindow.vue` e icono `customization.svg`:**
   - Diseñar una interfaz limpia estilo Windows Settings con navegación lateral/pestañas:
     - 🎨 **Color de barra de tareas:** Selección rápida con swatch circles y `<input type="color">` con vista previa en tiempo real.
     - 🌓 **Tema Claro / Oscuro:** Tarjetas interactivas con preview visual del contraste.
     - 🖼️ **Fondos de pantalla:** Galería de tarjetas en cuadrícula con miniaturas de los fondos precargados.
     - 🔤 **Tipografía:** Selector de tipografías con texto de demostración en vivo.
     - 📐 **Cuadrícula:** Configuración de alineación y botón para auto-reorganizar iconos del escritorio.

4. **Refactorización del Escritorio (`DesktopWorkspace.vue`) hacia Cuadrícula Estilo Windows:**
   - Definir cuadrícula matemática basada en constantes de celda (`CELL_W: 92px`, `CELL_H: 96px`, márgenes).
   - En `startItemDrag`, `onGlobalMouseMove` y `onGlobalMouseUp`:
     - Durante el movimiento libre de arrastre, proyectar a qué celda de la cuadrícula `(col, row)` se acoplará el icono.
     - Mostrar un recuadro de previsualización (grid cell highlight) en la celda correspondiente.
     - Al soltar (`mouseup`), acoplar estrictamente el icono a `(MARGIN_X + col * CELL_W, MARGIN_Y + row * CELL_H)`.
     - Si la celda está ocupada por otro archivo/acceso, buscar la celda libre más próxima en la cuadrícula.
     - Añadir función para "Alinear y reorganizar cuadrícula" automáticamente.
   - Conectar el fondo del escritorio reactivo con `customizationStore.activeWallpaperStyle`.
   - Añadir entrada "Personalizar" en el menú contextual del escritorio.

5. **Actualización de la Barra de Tareas (`Taskbar.vue`):**
   - Aplicar el color de fondo reactivo de la barra según `customizationStore.taskbarColor`.
   - En la bandeja derecha, agregar botón de acceso rápido para alternar tema claro/oscuro.
   - En el menú contextual de la barra de tareas, añadir opción para abrir la ventana de Personalización.

6. **Actualización del Menú de Inicio (`StartMenu.vue`) y Raíz (`App.vue`):**
   - En `StartMenu.vue`, incluir la aplicación "Personalización" con su icono y descripción en la cuadrícula.
   - En `App.vue`, aplicar las variables CSS dinámicas de tipografía (`--os-font-family`) y clases temáticas (`theme-dark` / `theme-light`).
   - Definir estilos de contraste adecuados para texto e interfaces tanto en modo oscuro como en modo claro.

7. **Pruebas y Verificación:**
   - Crear suite de pruebas en `frontend/src/__tests__/customization.spec.ts`.
   - Ejecutar pruebas con Vitest y validar TypeScript con `vue-tsc` o linter.
   - Comprobar que no hay errores de consola ni regresiones en las ventanas existentes.
