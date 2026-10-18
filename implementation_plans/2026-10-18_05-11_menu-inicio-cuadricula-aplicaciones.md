# Plan de Implementación: Transformación de la Vista de Aplicaciones en Menú de Inicio a Formato Cuadrícula (Grid Estilo Windows 11)

**Fecha y hora:** 2026-10-18 05:11  
**Rama:** `main` (o feature branch correspondiente)  

---

### 1. Objetivo de la tarea
Refactorizar la presentación de las aplicaciones dentro del componente `StartMenu.vue` de OogleOS para que, en lugar de renderizarse como una lista vertical de una sola columna, se muestren en una **cuadrícula de alta fidelidad estilo Windows 11 (Pinned Apps Grid)**:
1. Cuadrícula responsiva de 4 columnas (`grid-template-columns: repeat(4, 1fr)`).
2. Elementos con orientación vertical: Icono destacado en la parte superior, título centrado debajo, con micro-interacciones hover (elevación sutil, fondo glass y halo de foco).
3. Mantenimiento del buscador en tiempo real, selección por teclado (`Enter`, `Escape`), perfil de usuario inferior y botón de salida/apagado.

---

### 2. Lista exacta de archivos a crear, modificar o eliminar

#### Archivos a Modificar:
1. `frontend/src/components/desktop/StartMenu.vue`:
   - Modificar la estructura de `apps-grid` y `app-card` para orientación vertical centrada en columnas.
   - Ajustar el ancho del contenedor (`width: 480px`) para optimizar el espaciado de 4 columnas.
   - Actualizar estilos CSS (iconos a 44px, tipografía centrada y padding envolvente).
2. `frontend/src/__tests__/StartMenu.spec.ts`:
   - Verificar que los tests unitarios existentes sigan pasando con la nueva disposición en cuadrícula.

---

### 3. Cambios en base de datos, endpoints o estado (Pinia)
- No aplica (cambio puramente visual y de maquetación en el componente `StartMenu.vue`).

---

### 4. Pasos secuenciales de ejecución

1. **Creación del Plan de Implementación:**
   - Registrar este archivo según las reglas obligatorias del workspace.
2. **Modificación de `StartMenu.vue`:**
   - Reestructurar el marcado de `.app-card` para centrar el icono y el texto.
   - Reemplazar estilos de lista por `grid-template-columns: repeat(4, 1fr)` con gap equilibrado.
3. **Validación:**
   - Ejecutar suite de pruebas con `npx vitest run`.
   - Comprobar tipos con `npm run type-check`.
