# Plan de Implementación: Celdas Uniformes Simétricas en Menú de Inicio (Solo Icono y Nombre)

**Fecha y hora:** 2026-10-18 05:14  
**Rama:** `main` (o feature branch correspondiente)  

---

### 1. Objetivo de la tarea
Refinar el diseño visual de las tarjetas de aplicaciones en `StartMenu.vue` para que:
1. Todas las celdas de la cuadrícula tengan **exactamente el mismo tamaño** (altura fija y uniforme, anchura idéntica mediante `repeat(4, 1fr)`).
2. Se elimine cualquier texto de descripción: cada celda mostrará **únicamente el icono centrado en la parte superior y el nombre de la app debajo**.
3. Diseño limpio, perfectamente simétrico (8 apps distribuidas en una cuadrícula de 4×2), con esquinas redondeadas uniformes, fondo glass sutil y micro-interacciones hover consistentes.

---

### 2. Lista exacta de archivos a crear, modificar o eliminar

#### Archivos a Modificar:
1. `frontend/src/components/desktop/StartMenu.vue`:
   - Modificar la tarjeta de aplicación `.app-card` para establecer altura fija idéntica (`height: 88px`), centrado absoluto flex/grid y estructura limpia que contenga exclusivamente el contenedor del icono y el nombre.
   - Ajustar el padding y gap para garantizar alineación perfecta en las 2 filas de 4 columnas.
2. `frontend/src/__tests__/StartMenu.spec.ts`:
   - Verificar y asegurar que los tests unitarios pasen correctamente con esta estructura.

---

### 3. Cambios en base de datos, endpoints o estado (Pinia)
- No aplica (ajuste de presentación y diseño CSS/Vue en `StartMenu.vue`).

---

### 4. Pasos secuenciales de ejecución

1. **Creación del Plan de Implementación:**
   - Registrar este archivo según las reglas del workspace.
2. **Modificación de `StartMenu.vue`:**
   - Asegurar tamaño homogéneo en todas las celdas (`height: 88px`, `width: 100%`).
   - Mantener exclusivamente el icono SVG y el título del archivo.
3. **Validación:**
   - Ejecutar `npx vitest run` y `npm run type-check`.
   - Compilación con `npm run build-only`.
