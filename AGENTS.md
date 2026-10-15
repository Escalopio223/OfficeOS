# Reglas del Workspace / Workspace Rules

## REGLA DE FLUJO DE TRABAJO OBLIGATORIA (Implementation Plans)

Cada vez que el usuario pida desarrollar una nueva funcionalidad, refactorizar código o abordar un punto del roadmap, **ANTES de modificar o escribir código de la aplicación**, se debe generar un documento Markdown con el plan de implementación detallado y guardarlo dentro de la carpeta `/implementation_plans` en la raíz del proyecto.

### Formato del nombre de archivo
El nombre del archivo debe tener siempre el formato exacto:
`YYYY-MM-DD_HH-mm_nombre-descriptivo-de-la-tarea.md`
usando la fecha y hora actuales.

### Estructura obligatoria de cada plan
1. **Objetivo de la tarea**
2. **Lista exacta de archivos a crear, modificar o eliminar**
3. **Cambios en base de datos, endpoints o estado (Pinia)** (si aplican)
4. **Pasos secuenciales de ejecución**

> **RESTRICCIÓN ESTRICTA:** No tocar ni modificar archivos de código de la aplicación antes de que el plan correspondiente haya sido creado en `/implementation_plans/`.
