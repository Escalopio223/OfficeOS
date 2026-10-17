import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface WindowInstance {
    id: string;
    title: string;
    isOpen: boolean;
    isMinimized: boolean;
    isMaximized: boolean;
    zIndex: number;
    data?: any;
}

export type WindowId = 'oxplorer' | 'onotes' | 'osheets' | 'opics' | 'opdf';

export type WindowsMap = {
    [K in WindowId]: WindowInstance;
} & {
    [key: string]: WindowInstance | undefined;
};

export const useWindowStore = defineStore('windowManager', () => {
    const windows = ref<WindowsMap>({
        oxplorer: {
            id: 'oxplorer',
            title: 'Oxplorer',
            isOpen: false,
            isMinimized: false,
            isMaximized: false,
            zIndex: 10,
        },
        onotes: {
            id: 'onotes',
            title: 'Onotes',
            isOpen: false,
            isMinimized: false,
            isMaximized: false,
            zIndex: 11,
            data: null,
        },
        osheets: {
            id: 'osheets',
            title: 'Osheets (CSV)',
            isOpen: false,
            isMinimized: false,
            isMaximized: false,
            zIndex: 12,
            data: null,
        },
        opics: {
            id: 'opics',
            title: 'Opics',
            isOpen: false,
            isMinimized: false,
            isMaximized: false,
            zIndex: 13,
            data: null,
        },
        opdf: {
            id: 'opdf',
            title: 'Opdf',
            isOpen: false,
            isMinimized: false,
            isMaximized: false,
            zIndex: 14,
            data: null,
        },
    });

    const topZIndex = ref(20);

    function openWindow(id: string, data?: any) {
        const win = windows.value[id];
        if (!win) return;
        win.isOpen = true;
        win.isMinimized = false;
        if (data !== undefined) win.data = data;
        focusWindow(id);
    }

    function closeWindow(id: string) {
        const win = windows.value[id];
        if (!win) return;
        win.isOpen = false;
    }

    function toggleMinimize(id: string) {
        const win = windows.value[id];
        if (!win) return;
        if (win.isMinimized) {
            win.isMinimized = false;
            focusWindow(id);
        } else {
            win.isMinimized = true;
        }
    }

    function toggleMaximize(id: string) {
        const win = windows.value[id];
        if (win) {
            win.isMaximized = !win.isMaximized;
            focusWindow(id);
        }
    }

    function focusWindow(id: string) {
        const win = windows.value[id];
        if (win) {
            topZIndex.value++;
            win.zIndex = topZIndex.value;
        }
    }

    return {
        windows,
        openWindow,
        closeWindow,
        toggleMinimize,
        toggleMaximize,
        focusWindow,
    };
});