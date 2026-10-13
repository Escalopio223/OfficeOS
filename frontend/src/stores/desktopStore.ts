import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface DesktopItem {
    id: string;
    name: string;
    type: 'folder' | 'note' | 'oxplorer-node';
    content?: string;
    parentId: string | null;
    x?: number;
    y?: number;
    sizeBytes?: number;
    mimeType?: string;
}

export const useDesktopStore = defineStore('desktop', () => {
    const items = ref<DesktopItem[]>(
        JSON.parse(
            localStorage.getItem('oogle_desktop_items') ||
            JSON.stringify([
                {
                    id: 'note-welcome',
                    name: 'bienvenida.txt',
                    type: 'note',
                    content: '¡Bienvenido a OogleOS!\n\nEste entorno simula un sistema de archivos interactivo.\nPuedes crear carpetas, redactar notas con Onotes y arrastrar elementos desde Oxplorer.',
                    parentId: null,
                    x: 24,
                    y: 120,
                },
                {
                    id: 'folder-docs',
                    name: 'Mis Documentos',
                    type: 'folder',
                    parentId: null,
                    x: 24,
                    y: 220,
                },
            ])
        )
    );

    function saveToStorage() {
        localStorage.setItem('oogle_desktop_items', JSON.stringify(items.value));
    }

    function createNote(
        name = 'Nueva Nota.txt',
        parentId: string | null = null,
        content = '',
        x = 120,
        y = 120
    ) {
        const newNote: DesktopItem = {
            id: 'note-' + Date.now(),
            name,
            type: 'note',
            content,
            parentId,
            x,
            y,
        };
        items.value.push(newNote);
        saveToStorage();
        return newNote;
    }

    function createFolder(
        name = 'Nueva Carpeta',
        parentId: string | null = null,
        x = 120,
        y = 220
    ) {
        const newFolder: DesktopItem = {
            id: 'folder-' + Date.now(),
            name,
            type: 'folder',
            parentId,
            x,
            y,
        };
        items.value.push(newFolder);
        saveToStorage();
        return newFolder;
    }

    function renameItem(id: string, newName: string) {
        const item = items.value.find((i) => i.id === id);
        if (item && newName.trim()) {
            item.name = newName.trim();
            saveToStorage();
        }
    }

    function deleteItem(id: string) {
        const idsToDelete = new Set<string>([id]);
        let addedNew = true;

        while (addedNew) {
            addedNew = false;
            for (const item of items.value) {
                if (item.parentId && idsToDelete.has(item.parentId) && !idsToDelete.has(item.id)) {
                    idsToDelete.add(item.id);
                    addedNew = true;
                }
            }
        }

        items.value.filter((i) => !idsToDelete.has(i.id));
        items.value = items.value.filter((i) => !idsToDelete.has(i.id));
        saveToStorage();
    }

    function updateNoteContent(id: string, newContent: string) {
        const note = items.value.find((i) => i.id === id);
        if (note) {
            note.content = newContent;
            saveToStorage();
        }
    }

    function updatePosition(id: string, x: number, y: number) {
        const item = items.value.find((i) => i.id === id);
        if (item) {
            item.x = x;
            item.y = y;
            saveToStorage();
        }
    }

    function moveToFolder(itemId: string, targetFolderId: string | null) {
        const item = items.value.find((i) => i.id === itemId);
        if (item && item.id !== targetFolderId) {
            item.parentId = targetFolderId;
            saveToStorage();
        }
    }

    function importFromOxplorer(
        node: { id: string; name: string; size_bytes: number; mime_type: string | null },
        targetFolderId: string | null,
        x = 140,
        y = 140
    ) {
        const exists = items.value.some((i) => i.name === node.name && i.parentId === targetFolderId);
        const finalName = exists ? `${Date.now()}_${node.name}` : node.name;

        const isTextOrJson =
            node.name.endsWith('.txt') ||
            node.name.endsWith('.json') ||
            node.name.endsWith('.md');

        const newItem: DesktopItem = {
            id: 'ox-' + Date.now() + '-' + node.id,
            name: finalName,
            type: isTextOrJson ? 'note' : 'oxplorer-node',
            content: node.name.endsWith('.json')
                ? '{\n  "imported": true,\n  "source": "Oxplorer",\n  "nodeId": "' + node.id + '"\n}'
                : `Contenido simulado importado desde Oxplorer para ${node.name}`,
            parentId: targetFolderId,
            sizeBytes: node.size_bytes,
            mimeType: node.mime_type || undefined,
            x,
            y,
        };
        items.value.push(newItem);
        saveToStorage();
        return newItem;
    }

    function getFolderChildren(folderId: string | null) {
        return items.value.filter((i) => i.parentId === folderId);
    }

    return {
        items,
        createNote,
        createFolder,
        renameItem,
        deleteItem,
        updateNoteContent,
        updatePosition,
        moveToFolder,
        importFromOxplorer,
        getFolderChildren,
    };
});