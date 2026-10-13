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

export const useWindowStore = defineStore('windowManager', () => {
    const windows = ref<Record<string, WindowInstance>>({
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
        ophotos: {
            id: 'ophotos',
            title: 'Ophotos',
            isOpen: false,
            isMinimized: false,
            isMaximized: false,
            zIndex: 13,
            data: null,
        },
    });

    const topZIndex = ref(20);

    function openWindow(id: string, data?: any) {
        if (!windows.value[id]) return;
        windows.value[id].isOpen = true;
        windows.value[id].isMinimized = false;
        if (data !== undefined) windows.value[id].data = data;
        focusWindow(id);
    }

    function closeWindow(id: string) {
        if (!windows.value[id]) return;
        windows.value[id].isOpen = false;
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