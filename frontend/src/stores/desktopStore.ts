import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { FileNode, NodesResponse } from '@/types/filesystem';
import { filesystemEvent, notifyFilesystemChanged, useFileSystemStore } from '@/stores/filesystem';

export interface DesktopItem extends FileNode {
    type: 'folder' | 'note' | 'oxplorer-node';
    parentId: string | null;
    x: number;
    y: number;
}

export const useDesktopStore = defineStore('desktop', () => {
    const items = ref<DesktopItem[]>([]);
    const loading = ref(false);

    function toDesktopItem(node: FileNode, defaultX = 24, defaultY = 120): DesktopItem {
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

    // Calcula una celda libre en la cuadrícula si un nodo se creó desde Oxplorer sin coordenadas
    function findFreeGridSlot(existingItems: DesktopItem[], startX = 120, startY = 24): { x: number; y: number } {
        const iconW = 96;
        const iconH = 100;
        const maxRows = Math.max(3, Math.floor(((typeof window !== 'undefined' ? window.innerHeight : 800) - 100) / iconH));

        let col = 0;
        let row = 0;

        for (let iteration = 0; iteration < 200; iteration++) {
            const candidateX = startX + col * iconW;
            const candidateY = startY + row * iconH;

            // Evitar solapamiento con la columna de apps del sistema (x < 100 y y < 420)
            const isSystemAppSlot = candidateX < 100 && candidateY < 420;

            const occupied = isSystemAppSlot || existingItems.some((item) => {
                return (
                    Math.abs((item.x ?? 0) - candidateX) < 70 &&
                    Math.abs((item.y ?? 0) - candidateY) < 70
                );
            });

            if (!occupied) {
                return { x: candidateX, y: candidateY };
            }

            row++;
            if (row >= maxRows) {
                row = 0;
                col++;
            }
        }

        return { x: startX, y: startY };
    }

    async function fetchDesktopItems() {
        loading.value = true;
        try {
            const res = await fetch('/api/nodes?parentPath=root.desktop&limit=100');
            if (!res.ok) return;
            const data: NodesResponse = await res.json();

            const mapped: DesktopItem[] = [];
            const needsPositionSaving: { id: string; x: number; y: number }[] = [];

            for (const node of data.nodes) {
                if (node.pos_x === null || node.pos_x === undefined || node.pos_y === null || node.pos_y === undefined) {
                    const freeSlot = findFreeGridSlot(mapped);
                    const item = toDesktopItem(node, freeSlot.x, freeSlot.y);
                    item.pos_x = freeSlot.x;
                    item.pos_y = freeSlot.y;
                    item.x = freeSlot.x;
                    item.y = freeSlot.y;
                    mapped.push(item);
                    needsPositionSaving.push({ id: node.id, x: freeSlot.x, y: freeSlot.y });
                } else {
                    mapped.push(toDesktopItem(node, node.pos_x, node.pos_y));
                }
            }

            items.value = mapped;

            // Guardar en segundo plano las posiciones asignadas automáticamente
            for (const saving of needsPositionSaving) {
                fetch(`/api/nodes/${saving.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pos_x: saving.x, pos_y: saving.y }),
                }).catch(() => {});
            }
        } finally {
            loading.value = false;
        }
    }

    async function createNote(
        name = 'Nueva Nota.txt',
        content = '',
        x = 120,
        y = 120
    ): Promise<DesktopItem | null> {
        try {
            const res = await fetch('/api/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    is_directory: false,
                    content,
                    parentPath: 'root.desktop',
                    pos_x: x,
                    pos_y: y,
                    mime_type: 'text/plain',
                }),
            });
            if (!res.ok) return null;
            const node: FileNode = await res.json();
            const newItem = toDesktopItem(node, x, y);
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
        x = 120,
        y = 120
    ): Promise<DesktopItem | null> {
        try {
            const res = await fetch('/api/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    is_directory: false,
                    content,
                    parentPath: 'root.desktop',
                    pos_x: x,
                    pos_y: y,
                    mime_type: 'text/csv',
                }),
            });
            if (!res.ok) return null;
            const node: FileNode = await res.json();
            const newItem = toDesktopItem(node, x, y);
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
        x = 120,
        y = 120
    ): Promise<DesktopItem | null> {
        try {
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
                    pos_x: x,
                    pos_y: y,
                    mime_type: 'application/pdf',
                }),
            });
            if (!res.ok) return null;
            const node: FileNode = await res.json();
            const newItem = toDesktopItem(node, x, y);
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
        x = 120,
        y = 120
    ): Promise<DesktopItem | null> {
        try {
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
                    pos_x: x,
                    pos_y: y,
                    mime_type: 'application/x-opaint',
                }),
            });
            if (!res.ok) return null;
            const node: FileNode = await res.json();
            const newItem = toDesktopItem(node, x, y);
            items.value.push(newItem);
            notifyFilesystemChanged();
            return newItem;
        } catch {
            return null;
        }
    }

    async function createFolder(
        name = 'Nueva Carpeta',
        x = 120,
        y = 220,
        password?: string
    ): Promise<DesktopItem | null> {
        try {
            const res = await fetch('/api/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    is_directory: true,
                    parentPath: 'root.desktop',
                    pos_x: x,
                    pos_y: y,
                    password: password || undefined,
                }),
            });
            if (!res.ok) return null;
            const node: FileNode = await res.json();
            const newItem = toDesktopItem(node, x, y);
            items.value.push(newItem);
            if (password) {
                const fsStore = useFileSystemStore();
                fsStore.unlockFolder(node.id);
            }
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
            // Revertir si falla
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
        const item = items.value.find((i) => i.id === id);
        if (item) {
            item.x = x;
            item.y = y;
            item.pos_x = x;
            item.pos_y = y;
        }
        try {
            await fetch(`/api/nodes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pos_x: x, pos_y: y }),
            });
        } catch {}
    }

    async function moveToFolder(itemId: string, targetFolderId: string) {
        // Remover de la vista del escritorio ya que ahora pertenece a una subcarpeta
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
        fetchDesktopItems,
        createNote,
        createSheet,
        createPdf,
        createPaintFile,
        createFolder,
        renameItem,
        deleteItem,
        updateNoteContent,
        updatePosition,
        moveToFolder,
        getFolderChildren,
    };
});