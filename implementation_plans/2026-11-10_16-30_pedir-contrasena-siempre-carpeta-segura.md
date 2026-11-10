# Plan de Implementación - Requerir Contraseña Siempre al Entrar en Carpetas Seguras

## 1. Objetivo de la tarea
Garantizar que cada vez que un usuario intente acceder a una carpeta protegida con contraseña (ya sea desde el Escritorio o dentro de Oxplorer), el sistema solicite obligatoriamente la contraseña, eliminando la persistencia en memoria del estado desbloqueado (`unlockedFolderIds`) que permitía entrar sin pedir clave tras el primer acceso.

---

## 2. Lista exacta de archivos a crear, modificar o eliminar
- **Modificar:**
  - `frontend/src/stores/filesystem.ts`:
    - Eliminar la persistencia de IDs desbloqueados en `unlockedFolderIds` tras verificar la contraseña, crear carpeta o protegerla.
    - Asegurar que `isFolderUnlocked` no evite la solicitud de credenciales o se adapte para que cada navegación verifique la contraseña.
  - `frontend/src/stores/desktopStore.ts`:
    - Quitar la llamada a `unlockFolder` al crear una carpeta con contraseña.
  - `frontend/src/components/desktop/DesktopWorkspace.vue`:
    - Modificar la condición en `handleItemDoubleClick` para que si `item.is_protected` es verdadero, siempre invoque a `openUnlockModal(item)` sin excepciones.
  - `frontend/src/components/apps/oxplorer/OxplorerWindow.vue`:
    - Modificar la condición en `handleItemDoubleClick` para que si `item.is_protected` es verdadero, siempre invoque a `openUnlockModal(item)` en cada entrada a la carpeta.
- **Crear:**
  - `frontend/src/__tests__/secureFolder.spec.ts`:
    - Pruebas unitarias para validar el flujo del store `filesystem` y asegurar que no memorice el estado desbloqueado de las carpetas protegidas.

---

## 3. Cambios en base de datos, endpoints o estado (Pinia)
- **Base de datos:** Ningún cambio (el esquema ya cuenta con `is_protected` y hash de contraseña).
- **Endpoints:** Ningún cambio (se mantiene `/api/nodes/:id/verify-password`).
- **Estado (Pinia):**
  - En `useFileSystemStore`:
    - `unlockedFolderIds`: no mantendrá de forma persistente carpetas para saltarse el prompt.
    - `verifyFolderPassword`: validará la contraseña contra el backend retornando un booleano sin añadir el ID a una lista de omisión persistente.

---

## 4. Pasos secuenciales de ejecución
1. **Crear el plan de implementación** en `implementation_plans/2026-11-10_16-30_pedir-contrasena-siempre-carpeta-segura.md`.
2. **Actualizar `frontend/src/stores/filesystem.ts`:**
   - Evitar almacenar IDs desbloqueados permanentes en `unlockedFolderIds` en `verifyFolderPassword`, `createNode` y `setFolderPassword`.
   - Modificar `isFolderUnlocked` para devolver siempre `false` o retirar la lógica de bypass.
3. **Actualizar `frontend/src/stores/desktopStore.ts`:**
   - Retirar `fsStore.unlockFolder(node.id)` tras crear una carpeta con contraseña.
4. **Actualizar `frontend/src/components/desktop/DesktopWorkspace.vue`:**
   - En `handleItemDoubleClick`: verificar `if (item.is_protected)` directamente para llamar a `openUnlockModal(item)`.
5. **Actualizar `frontend/src/components/apps/oxplorer/OxplorerWindow.vue`:**
   - En `handleItemDoubleClick`: verificar `if (item.is_protected)` directamente para llamar a `openUnlockModal(item)`.
6. **Crear prueba unitaria `frontend/src/__tests__/secureFolder.spec.ts`:**
   - Validar que verificar una contraseña no guarde la carpeta como permanentemente desbloqueada y que las llamadas a verificación funcionen de forma idempotente.
7. **Ejecutar suite completa de tests de Vitest:**
   - Verificar que todos los tests pasen exitosamente.
8. **Realizar commit de los cambios en la rama `fix/secure-folder`:**
   - Registrar los cambios en git.
