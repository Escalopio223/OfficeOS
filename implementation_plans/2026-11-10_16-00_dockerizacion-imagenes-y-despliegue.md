# Plan de Implementación: Dockerización y Carga de Imágenes en Docker (Frontend, Backend, Postgres, Redis)

**Fecha y hora:** 2026-11-10 16:00  
**Rama de trabajo:** `feature/customization`  
**Autor:** Agente Antigravity / OfficeOS Team

---

## 1. Objetivo de la tarea

Construir, empaquetar y cargar las imágenes de Docker de la aplicación OfficeOS (Frontend y Backend) en el motor local de Docker, integrándolas en el archivo `docker-compose.yml` junto con la corrección del volumen de inicialización de PostgreSQL, permitiendo que las imágenes queden disponibles localmente (`docker images`) y ejecutables en un solo paso (`docker compose up -d`).

Asimismo, proveer la solución para la inyección o copia de archivos de imagen multimedia dentro de contenedores o volúmenes (`docker cp` y volúmenes compartidos).

---

## 2. Lista exacta de archivos a crear, modificar o eliminar

### Archivos a crear:
- `backend/Dockerfile`: Configuración para construir la imagen Docker del backend Node.js.
- `frontend/Dockerfile`: Configuración multi-stage (Node.js builder + Nginx Alpine) para servir la SPA de Vue 3 en producción con reenvío de API.
- `frontend/nginx.conf`: Configuración de Nginx para enrutar rutas SPA (`try_files $uri /index.html`) y proxy hacia `/api/` del backend.
- `backend/.dockerignore`: Exclusión de `node_modules`, `.git` y temporales del build.
- `frontend/.dockerignore`: Exclusión de `node_modules`, `dist`, `.git` del build.

### Archivos a modificar:
- `docker-compose.yml`:
  - Corregir la ruta de inicialización de PostgreSQL: `./docker/postgres/init/01_init.sql:/docker-entrypoint-initdb.d/01_init.sql`.
  - Añadir el servicio `backend` con build context `./backend`, variables de entorno para Postgres y Redis, y exposición del puerto 3000.
  - Añadir el servicio `frontend` con build context `./frontend`, exposición del puerto 80 (o 5173/8080) y dependencia del backend.

### Archivos a eliminar:
- Ninguno.

---

## 3. Cambios en base de datos, endpoints o estado (Pinia)
- No afecta al estado de Pinia ni a endpoints existentes; se estandariza el entorno de ejecución multi-contenedor de Docker.

---

## 4. Pasos secuenciales de ejecución

1. **Creación del Implementation Plan:** Guardar este documento en `/implementation_plans/`.
2. **Creación de Dockerfile y `.dockerignore` en `backend/`:**
   - Base `node:22-alpine` para máxima ligereza y seguridad.
   - Instalación de dependencias de producción y ejecución de servidor mediante `tsx` o compilado.
3. **Creación de Dockerfile, `.dockerignore` y `nginx.conf` en `frontend/`:**
   - Multi-stage build: Etapa 1 construye el bundle con `npm run build-only`.
   - Etapa 2 copia los estáticos resultantes a `nginx:alpine` configurando las rutas virtuales y proxy a la API.
4. **Actualización de `docker-compose.yml`:**
   - Integrar los servicios `backend` y `frontend` con sus respectivos contextos de compilación.
   - Ajustar la ruta del script SQL inicial a `docker/postgres/init/01_init.sql`.
5. **Construcción y Registro de Imágenes en Docker:**
   - Ejecutar `docker compose build` o `docker build` para crear las imágenes locales en el daemon de Docker.
   - Verificar la presencia de las imágenes mediante `docker images`.
6. **Explicación completa al usuario:**
   - Cómo se han creado y cargado las imágenes en Docker.
   - Cómo levantar todo el entorno con un comando.
   - Cómo transferir archivos de imágenes (jpg, png) hacia contenedores si ese fuera el caso alternativo.
