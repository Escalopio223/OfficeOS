import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { FileNode, NodesResponse } from '@/types/filesystem';
import { filesystemEvent, notifyFilesystemChanged } from '@/stores/filesystem';

export const GRID_OFFSET_X = 20;
export const GRID_OFFSET_Y = 20;
export const GRID_CELL_WIDTH = 92;
export const GRID_CELL_HEIGHT = 96;

export const DEFAULT_SYSTEM_APP_POSITIONS: Record<string, { x: number; y: number }> = {
    app_oxplorer: { x: 20, y: 20 },
    app_onotes: { x: 20, y: 116 },
    app_osheets: { x: 20, y: 212 },
    app_opics: { x: 20, y: 308 },
    app_opdf: { x: 20, y: 404 },
    app_opaint: { x: 20, y: 500 },
    app_omonitor: { x: 20, y: 596 },
    app_oplanner: { x: 20, y: 692 },
    app_customization: { x: 112, y: 20 },
};

export interface DesktopItem extends FileNode {
    type: 'folder' | 'note' | 'oxplorer-node';
    parentId: string | null;
    x: number;
    y: number;
}

export const useDesktopStore = defineStore('desktop', () => {
    const items = ref<DesktopItem[]>([]);
    const loading = ref(false);
    const systemAppPositions = ref<Record<string, { x: number; y: number }>>(
        JSON.parse(JSON.stringify(DEFAULT_SYSTEM_APP_POSITIONS))
    );

    function setSystemAppPosition(appId: string, x: number, y: number) {
        systemAppPositions.value[appId] = { x, y };
    }

    function getGridLimits() {
        const w = typeof window !== 'undefined' && window.innerWidth > 200 ? window.innerWidth : 1280;
        const h = typeof window !== 'undefined' && window.innerHeight > 200 ? window.innerHeight - 50 : 800;
        const maxCols = Math.max(4, Math.floor((w - GRID_OFFSET_X) / GRID_CELL_WIDTH));
        const maxRows = Math.max(4, Math.floor((h - GRID_OFFSET_Y) / GRID_CELL_HEIGHT));
        return { maxCols, maxRows };
    }

    function snapToGrid(px: number, py: number): { col: number; row: number; x: number; y: number } {
        const { maxCols, maxRows } = getGridLimits();
        let col = Math.round((px - GRID_OFFSET_X) / GRID_CELL_WIDTH);
        let row = Math.round((py - GRID_OFFSET_Y) / GRID_CELL_HEIGHT);
        col = Math.max(0, Math.min(maxCols - 1, col));
        row = Math.max(0, Math.min(maxRows - 1, row));
        return {
            col,
            row,
            x: GRID_OFFSET_X + col * GRID_CELL_WIDTH,
            y: GRID_OFFSET_Y + row * GRID_CELL_HEIGHT,
        };
    }

    function isCellOccupied(
        candidateX: number,
        candidateY: number,
        existingItems: DesktopItem[] = items.value,
        excludeId: string | null = null
    ): boolean {
        // 1. Verificar contra aplicaciones del sistema en el escritorio
        for (const [appId, pos] of Object.entries(systemAppPositions.value)) {
            if (appId !== excludeId) {
                if (Math.abs(pos.x - candidateX) < 40 && Math.abs(pos.y - candidateY) < 40) {
                    return true;
                }
            }
        }

        // 2. Verificar contra otros archivos/carpetas del escritorio
        for (const item of existingItems) {
            if (item.id !== excludeId) {
                const ix = item.x ?? item.pos_x ?? 0;
                const iy = item.y ?? item.pos_y ?? 0;
                if (Math.abs(ix - candidateX) < 40 && Math.abs(iy - candidateY) < 40) {
                    return true;
                }
            }
        }

        return false;
    }

    // Garantiza que cada archivo o app tenga una coordenada de cuadrícula única y sin colisiones
    function resolveUniqueGridPosition(
        preferredX: number | null | undefined = null,
        preferredY: number | null | undefined = null,
        existingItems: DesktopItem[] = items.value,
        excludeId: string | null = null
    ): { x: number; y: number } {
        const { maxCols, maxRows } = getGridLimits();

        if (preferredX !== null && preferredX !== undefined && preferredY !== null && preferredY !== undefined) {
            const snapped = snapToGrid(preferredX, preferredY);
            if (!isCellOccupied(snapped.x, snapped.y, existingItems, excludeId)) {
                return { x: snapped.x, y: snapped.y };
            }

            // Buscar en espiral la celda libre más cercana
            for (let radius = 1; radius < Math.max(maxCols, maxRows) + 10; radius++) {
                for (let dc = -radius; dc <= radius; dc++) {
                    for (let dr = -radius; dr <= radius; dr++) {
                        if (Math.abs(dc) !== radius && Math.abs(dr) !== radius) continue;
                        const c = snapped.col + dc;
                        const r = snapped.row + dr;
                        if (c >= 0 && c < maxCols && r >= 0 && r < maxRows) {
                            const cx = GRID_OFFSET_X + c * GRID_CELL_WIDTH;
                            const cy = GRID_OFFSET_Y + r * GRID_CELL_HEIGHT;
                            if (!isCellOccupied(cx, cy, existingItems, excludeId)) {
                                return { x: cx, y: cy };
                            }
                        }
                    }
                }
            }
        }

        // Búsqueda secuencial por columnas y filas
        for (let c = 0; c < maxCols + 10; c++) {
            for (let r = 0; r < maxRows; r++) {
                const cx = GRID_OFFSET_X + c * GRID_CELL_WIDTH;
                const cy = GRID_OFFSET_Y + r * GRID_CELL_HEIGHT;
                if (!isCellOccupied(cx, cy, existingItems, excludeId)) {
                    return { x: cx, y: cy };
                }
            }
        }

        return { x: GRID_OFFSET_X + GRID_CELL_WIDTH, y: GRID_OFFSET_Y + GRID_CELL_HEIGHT };
    }

    function toDesktopItem(node: FileNode, defaultX = 112, defaultY = 116): DesktopItem {
        const isDir = Boolean(node.is_directory);
        const isText =
            node.name.endsWith('.txt') ||
            node.name.endsWith('.json') ||
            node.name.endsWith('.md');

        return {
            ...node,
            is_directory: isDir,
            type: isDir ? 'folder' : isText ? 'note' : 'oxplorer-node',
            parentId: node.parent_id,
            x: node.pos_x ?? defaultX,
            y: node.pos_y ?? defaultY,
        };
    }

    async function fetchDesktopItems() {
        loading.value = true;
        try {
            const res = await fetch('/api/nodes?parentPath=root.desktop&limit=100');
            if (!res.ok) return;
            const data: NodesResponse = await res.json();

            const mapped: DesktopItem[] = [];
            const needsPositionSaving: { id: string; x: number; y: number }[] = [];

            for (const node of (data.nodes || [])) {
                const validPos = resolveUniqueGridPosition(node.pos_x, node.pos_y, mapped, node.id);
                const item = toDesktopItem(node, validPos.x, validPos.y);
                item.pos_x = validPos.x;
                item.pos_y = validPos.y;
                item.x = validPos.x;
                item.y = validPos.y;
                mapped.push(item);

                if (node.pos_x !== validPos.x || node.pos_y !== validPos.y) {
                    needsPositionSaving.push({ id: node.id, x: validPos.x, y: validPos.y });
                }
            }

            items.value = mapped;

            // Guardar en segundo plano las posiciones asignadas o corregidas automáticamente
            for (const saving of needsPositionSaving) {
                fetch(`/api/nodes/${saving.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pos_x: saving.x, pos_y: saving.y }),
                }).catch(() => {});
            }
        } catch {
            // Ignorar fallos de red o de entorno sin servidor
        } finally {
            loading.value = false;
        }
    }

    async function createNote(
        name = 'Nueva Nota.txt',
        content = '',
        x?: number | null,
        y?: number | null
    ): Promise<DesktopItem | null> {
        try {
            const pos = resolveUniqueGridPosition(x, y, items.value, null);
            const res = await fetch('/api/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    is_directory: false,
                    content,
                    parentPath: 'root.desktop',
                    pos_x: pos.x,
                    pos_y: pos.y,
                    mime_type: 'text/plain',
                }),
            });
            if (!res.ok) return null;
            const node: FileNode = await res.json();
            const newItem = toDesktopItem(node, pos.x, pos.y);
            newItem.x = pos.x;
            newItem.y = pos.y;
            newItem.pos_x = pos.x;
            newItem.pos_y = pos.y;
            items.value.push(newItem);
            notifyFilesystemChanged();
            return newItem;
        } catch {
            return null;
        }
    }

    async function createSheet(
        name = 'Nuevo Documento.csv',
        content = 'id,producto,precio,stock\n1,Teclado Mecánico,79.99,15\n2,Ratón Inalámbrico,39.99,28',
        x?: number | null,
        y?: number | null
    ): Promise<DesktopItem | null> {
        try {
            const pos = resolveUniqueGridPosition(x, y, items.value, null);
            const res = await fetch('/api/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    is_directory: false,
                    content,
                    parentPath: 'root.desktop',
                    pos_x: pos.x,
                    pos_y: pos.y,
                    mime_type: 'text/csv',
                }),
            });
            if (!res.ok) return null;
            const node: FileNode = await res.json();
            const newItem = toDesktopItem(node, pos.x, pos.y);
            newItem.x = pos.x;
            newItem.y = pos.y;
            newItem.pos_x = pos.x;
            newItem.pos_y = pos.y;
            items.value.push(newItem);
            notifyFilesystemChanged();
            return newItem;
        } catch {
            return null;
        }
    }

    async function createPdf(
        name = 'Nuevo Documento.pdf',
        content = '',
        x?: number | null,
        y?: number | null
    ): Promise<DesktopItem | null> {
        try {
            const pos = resolveUniqueGridPosition(x, y, items.value, null);
            let pdfName = name.trim();
            if (!pdfName.toLowerCase().endsWith('.pdf')) {
                pdfName += '.pdf';
            }
            const res = await fetch('/api/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: pdfName,
                    is_directory: false,
                    content,
                    parentPath: 'root.desktop',
                    pos_x: pos.x,
                    pos_y: pos.y,
                    mime_type: 'application/pdf',
                }),
            });
            if (!res.ok) return null;
            const node: FileNode = await res.json();
            const newItem = toDesktopItem(node, pos.x, pos.y);
            newItem.x = pos.x;
            newItem.y = pos.y;
            newItem.pos_x = pos.x;
            newItem.pos_y = pos.y;
            items.value.push(newItem);
            notifyFilesystemChanged();
            return newItem;
        } catch {
            return null;
        }
    }

    async function createPaintFile(
        name = 'Nuevo Dibujo.opaint',
        content = '',
        x?: number | null,
        y?: number | null
    ): Promise<DesktopItem | null> {
        try {
            const pos = resolveUniqueGridPosition(x, y, items.value, null);
            let paintName = name.trim();
            if (!paintName.toLowerCase().endsWith('.opaint')) {
                paintName += '.opaint';
            }
            const res = await fetch('/api/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: paintName,
                    is_directory: false,
                    content,
                    parentPath: 'root.desktop',
                    pos_x: pos.x,
                    pos_y: pos.y,
                    mime_type: 'application/x-opaint',
                }),
            });
            if (!res.ok) return null;
            const node: FileNode = await res.json();
            const newItem = toDesktopItem(node, pos.x, pos.y);
            newItem.x = pos.x;
            newItem.y = pos.y;
            newItem.pos_x = pos.x;
            newItem.pos_y = pos.y;
            items.value.push(newItem);
            notifyFilesystemChanged();
            return newItem;
        } catch {
            return null;
        }
    }

    async function createPlannerFile(
        name = 'Nuevo Proyecto.oplanner',
        content = '',
        x?: number | null,
        y?: number | null
    ): Promise<DesktopItem | null> {
        try {
            const pos = resolveUniqueGridPosition(x, y, items.value, null);
            let plannerName = name.trim();
            if (!plannerName.toLowerCase().endsWith('.oplanner')) {
                plannerName += '.oplanner';
            }
            const res = await fetch('/api/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: plannerName,
                    is_directory: false,
                    content,
                    parentPath: 'root.desktop',
                    pos_x: pos.x,
                    pos_y: pos.y,
                    mime_type: 'application/json',
                }),
            });
            if (!res.ok) return null;
            const node: FileNode = await res.json();
            const newItem = toDesktopItem(node, pos.x, pos.y);
            newItem.x = pos.x;
            newItem.y = pos.y;
            newItem.pos_x = pos.x;
            newItem.pos_y = pos.y;
            items.value.push(newItem);
            notifyFilesystemChanged();
            return newItem;
        } catch {
            return null;
        }
    }

    async function createFolder(
        name = 'Nueva Carpeta',
        x?: number | null,
        y?: number | null,
        password?: string
    ): Promise<DesktopItem | null> {
        try {
            const pos = resolveUniqueGridPosition(x, y, items.value, null);
            const res = await fetch('/api/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    is_directory: true,
                    parentPath: 'root.desktop',
                    pos_x: pos.x,
                    pos_y: pos.y,
                    password: password || undefined,
                }),
            });
            if (!res.ok) return null;
            const node: FileNode = await res.json();
            const newItem = toDesktopItem(node, pos.x, pos.y);
            newItem.x = pos.x;
            newItem.y = pos.y;
            newItem.pos_x = pos.x;
            newItem.pos_y = pos.y;
            items.value.push(newItem);
            notifyFilesystemChanged();
            return newItem;
        } catch {
            return null;
        }
    }

    async function renameItem(id: string, newName: string) {
        const item = items.value.find((i) => i.id === id);
        if (!item || !newName.trim()) return;

        item.name = newName.trim();
        try {
            await fetch(`/api/nodes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName.trim() }),
            });
            notifyFilesystemChanged();
        } catch {
            await fetchDesktopItems();
        }
    }

    async function deleteItem(id: string) {
        items.value = items.value.filter((i) => i.id !== id);
        try {
            await fetch(`/api/nodes/${id}`, { method: 'DELETE' });
            notifyFilesystemChanged();
        } catch {
            await fetchDesktopItems();
        }
    }

    async function updateNoteContent(id: string, newContent: string) {
        const note = items.value.find((i) => i.id === id);
        if (note) {
            note.content = newContent;
        }
        try {
            await fetch(`/api/nodes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newContent }),
            });
            notifyFilesystemChanged();
        } catch {}
    }

    async function updatePosition(id: string, x: number, y: number) {
        const validPos = resolveUniqueGridPosition(x, y, items.value, id);
        const item = items.value.find((i) => i.id === id);
        if (item) {
            item.x = validPos.x;
            item.y = validPos.y;
            item.pos_x = validPos.x;
            item.pos_y = validPos.y;
        }
        try {
            await fetch(`/api/nodes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pos_x: validPos.x, pos_y: validPos.y }),
            });
        } catch {}
    }

    async function moveToFolder(itemId: string, targetFolderId: string) {
        items.value = items.value.filter((i) => i.id !== itemId);
        try {
            await fetch(`/api/nodes/${itemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetFolderId,
                    pos_x: null,
                    pos_y: null,
                }),
            });
            notifyFilesystemChanged();
        } catch {
            await fetchDesktopItems();
        }
    }

    function getFolderChildren(folderId: string | null) {
        if (!folderId || folderId === 'root.desktop') {
            return items.value;
        }
        return items.value.filter((i) => i.parent_id === folderId);
    }

    // Sincronización en tiempo real: cuando Oxplorer u otra app modifique archivos, recargar Escritorio
    watch(filesystemEvent, () => {
        fetchDesktopItems();
    });

    // Carga inicial
    fetchDesktopItems();

    return {
        items,
        loading,
        systemAppPositions,
        setSystemAppPosition,
        snapToGrid,
        isCellOccupied,
        resolveUniqueGridPosition,
        fetchDesktopItems,
        createNote,
        createSheet,
        createPdf,
        createPaintFile,
        createPlannerFile,
        createFolder,
        renameItem,
        deleteItem,
        updateNoteContent,
        updatePosition,
        moveToFolder,
        getFolderChildren,
    };
});
