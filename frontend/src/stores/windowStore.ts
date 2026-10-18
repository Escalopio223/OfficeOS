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
    pid?: number;
    openedAt?: number;
}

export type WindowId = 'oxplorer' | 'onotes' | 'osheets' | 'opics' | 'opdf' | 'opaint' | 'omonitor' | 'oplanner';

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
        opaint: {
            id: 'opaint',
            title: 'Opaint',
            isOpen: false,
            isMinimized: false,
            isMaximized: false,
            zIndex: 15,
            data: null,
        },
        omonitor: {
            id: 'omonitor',
            title: 'Administrador de tareas - Omonitor',
            isOpen: false,
            isMinimized: false,
            isMaximized: false,
            zIndex: 16,
            data: null,
        },
        oplanner: {
            id: 'oplanner',
            title: 'Oplanner',
            isOpen: false,
            isMinimized: false,
            isMaximized: false,
            zIndex: 17,
            data: null,
        },
    });

    const topZIndex = ref(20);

    function openWindow(id: string, data?: any) {
        const win = windows.value[id];
        if (!win) return;
        if (!win.isOpen) {
            win.openedAt = Date.now();
            win.pid = Math.floor(1000 + Math.random() * 8999);
        }
        win.isOpen = true;
        win.isMinimized = false;
        if (data !== undefined) win.data = data;
        focusWindow(id);
    }

    function closeWindow(id: string) {
        const win = windows.value[id];
        if (!win) return;
        win.isOpen = false;
        win.openedAt = undefined;
        win.pid = undefined;
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

    // Alternar 'Mostrar escritorio' (minimizar todas las ventanas o restaurarlas)
    function toggleShowDesktop() {
        const openWins = Object.values(windows.value).filter((w): w is WindowInstance => !!w && w.isOpen);
        const hasUnminimized = openWins.some((w) => !w.isMinimized);

        for (const w of openWins) {
            w.isMinimized = hasUnminimized;
        }
    }

    return {
        windows,
        openWindow,
        closeWindow,
        toggleMinimize,
        toggleMaximize,
        focusWindow,
        toggleShowDesktop,
    };
});