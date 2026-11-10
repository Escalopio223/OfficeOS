import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import {
  useCustomizationStore,
  WALLPAPER_PRESETS,
  TASKBAR_COLOR_PRESETS,
  FONT_PRESETS,
} from '@/stores/customizationStore';
import { useWindowStore } from '@/stores/windowStore';
import { useDesktopStore } from '@/stores/desktopStore';

describe('Customization Suite - Temas, Barra de Tareas, Fondos y Tipografía', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear();
    } else {
      const mockStorage: Record<string, string> = {};
      vi.stubGlobal('localStorage', {
        getItem: vi.fn((key: string) => mockStorage[key] || null),
        setItem: vi.fn((key: string, val: string) => {
          mockStorage[key] = val;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockStorage[key];
        }),
        clear: vi.fn(() => {
          for (const k of Object.keys(mockStorage)) delete mockStorage[k];
        }),
      });
    }
  });

  it('1. Inicializa con los valores por defecto esperados', () => {
    const store = useCustomizationStore();
    expect(store.theme).toBe('dark');
    expect(store.taskbarColor).toBe('#11111b');
    expect(store.wallpaperId).toBe('oogle');
    expect(store.fontFamilyId).toBe('system');
    expect(store.themeClass).toBe('theme-dark');
  });

  it('2. Permite cambiar el color de la barra de tareas a valores de la paleta y personalizados', () => {
    const store = useCustomizationStore();
    
    // Probar color de la paleta
    store.setTaskbarColor(TASKBAR_COLOR_PRESETS[1]!.color);
    expect(store.taskbarColor).toBe('#0f172a');
    expect(store.rootStyle['--os-taskbar-bg']).toBe('#0f172a');

    // Probar color hexadecimal personalizado
    store.setTaskbarColor('#ff0055');
    expect(store.taskbarColor).toBe('#ff0055');
    expect(store.rootStyle['--os-taskbar-bg']).toBe('#ff0055');
  });

  it('3. Permite alternar entre tema oscuro y tema claro', () => {
    const store = useCustomizationStore();
    expect(store.theme).toBe('dark');
    expect(store.themeClass).toBe('theme-dark');

    store.toggleTheme();
    expect(store.theme).toBe('light');
    expect(store.themeClass).toBe('theme-light');

    store.toggleTheme();
    expect(store.theme).toBe('dark');
    expect(store.themeClass).toBe('theme-dark');

    store.setTheme('light');
    expect(store.theme).toBe('light');
  });

  it('4. Permite cambiar fondos de pantalla de la lista precargada', () => {
    const store = useCustomizationStore();
    
    // Seleccionar fondo 'nebula'
    store.setWallpaper('nebula');
    expect(store.wallpaperId).toBe('nebula');
    expect(store.activeWallpaper.name).toBe('Nebulosa Cósmica');
    expect(store.wallpaperStyle.background).toBeDefined();

    // Seleccionar fondo 'cyber-neon'
    store.setWallpaper('cyber-neon');
    expect(store.wallpaperId).toBe('cyber-neon');
    expect(store.activeWallpaper.name).toBe('Cyber Neon Dark');

    // Ignora IDs que no existen
    store.setWallpaper('inexistente');
    expect(store.wallpaperId).toBe('cyber-neon');
  });

  it('5. Permite cambiar la tipografía del sistema', () => {
    const store = useCustomizationStore();

    store.setFontFamily('monospace');
    expect(store.fontFamilyId).toBe('monospace');
    expect(store.activeFont.fontFamily).toContain('Consolas');
    expect(store.rootStyle['--os-font-family']).toContain('Consolas');

    store.setFontFamily('serif');
    expect(store.fontFamilyId).toBe('serif');
    expect(store.activeFont.fontFamily).toContain('Georgia');
  });

  it('6. Restaura todos los ajustes por defecto', () => {
    const store = useCustomizationStore();
    store.setTheme('light');
    store.setTaskbarColor('#064e3b');
    store.setWallpaper('sunset');
    store.setFontFamily('friendly');

    store.resetDefaults();
    expect(store.theme).toBe('dark');
    expect(store.taskbarColor).toBe('#11111b');
    expect(store.wallpaperId).toBe('oogle');
    expect(store.fontFamilyId).toBe('system');
  });

  it('7. Integra la ventana de personalización en useWindowStore', () => {
    const winStore = useWindowStore();
    expect(winStore.windows['customization']).toBeDefined();
    expect(winStore.windows['customization']?.title).toBe('Personalización del Sistema');
    expect(winStore.windows['customization']?.isOpen).toBe(false);

    winStore.openWindow('customization');
    expect(winStore.windows['customization']?.isOpen).toBe(true);

    winStore.closeWindow('customization');
    expect(winStore.windows['customization']?.isOpen).toBe(false);
  });

  it('8. Matemáticas de cuadrícula discreta de escritorio estilo Windows', () => {
    const GRID_CELL_WIDTH = 92;
    const GRID_CELL_HEIGHT = 96;
    const GRID_OFFSET_X = 20;
    const GRID_OFFSET_Y = 20;

    function snapToGrid(px: number, py: number) {
      const col = Math.max(0, Math.round((px - GRID_OFFSET_X) / GRID_CELL_WIDTH));
      const row = Math.max(0, Math.round((py - GRID_OFFSET_Y) / GRID_CELL_HEIGHT));
      return {
        col,
        row,
        x: GRID_OFFSET_X + col * GRID_CELL_WIDTH,
        y: GRID_OFFSET_Y + row * GRID_CELL_HEIGHT,
      };
    }

    // Coordenada exacta de celda 0,0
    const pos0 = snapToGrid(20, 20);
    expect(pos0.col).toBe(0);
    expect(pos0.row).toBe(0);
    expect(pos0.x).toBe(20);
    expect(pos0.y).toBe(20);

    // Arrastre cercano debe acoplarse magnéticamente a la celda 0,0
    const posNear = snapToGrid(45, 38);
    expect(posNear.col).toBe(0);
    expect(posNear.row).toBe(0);
    expect(posNear.x).toBe(20);
    expect(posNear.y).toBe(20);

    // Arrastre hacia la siguiente fila (row 1)
    const posRow1 = snapToGrid(20, 110);
    expect(posRow1.col).toBe(0);
    expect(posRow1.row).toBe(1);
    expect(posRow1.x).toBe(20);
    expect(posRow1.y).toBe(116);

    // Arrastre hacia la siguiente columna (col 1, row 2)
    const posCol1Row2 = snapToGrid(120, 215);
    expect(posCol1Row2.col).toBe(1);
    expect(posCol1Row2.row).toBe(2);
    expect(posCol1Row2.x).toBe(112);
    expect(posCol1Row2.y).toBe(212);
  });

  it('9. Impide que los archivos compartan coordenada con aplicaciones del sistema o entre sí', () => {
    const desktopStore = useDesktopStore();

    // Intentar colocar un archivo sobre Oxplorer (20, 20) debe reubicarlo a una celda libre
    const pos1 = desktopStore.resolveUniqueGridPosition(24, 24, []);
    expect(pos1.x === 20 && pos1.y === 20).toBe(false);

    // Intentar colocar un archivo sobre Personalización (112, 20) debe reubicarlo a una celda libre
    const pos2 = desktopStore.resolveUniqueGridPosition(118, 24, []);
    expect(pos2.x === 112 && pos2.y === 20).toBe(false);

    // Dos archivos que piden la misma celda libre (112, 116) reciben coordenadas distintas
    const firstFilePos = desktopStore.resolveUniqueGridPosition(112, 116, []);
    expect(firstFilePos).toEqual({ x: 112, y: 116 });

    const mockExisting = [
      { id: 'file-1', name: 'Uno.txt', x: firstFilePos.x, y: firstFilePos.y, pos_x: firstFilePos.x, pos_y: firstFilePos.y } as any,
    ];
    const secondFilePos = desktopStore.resolveUniqueGridPosition(112, 116, mockExisting);
    expect(secondFilePos).not.toEqual(firstFilePos);
  });

  it('10. Detecta celdas ocupadas (en rojo) y solo permite soltar en cuadrículas libres', () => {
    const desktopStore = useDesktopStore();
    const existingItems = [
      { id: 'resumen-csv', name: 'Resumen.csv', x: 112, y: 404, pos_x: 112, pos_y: 404 } as any,
      { id: 'guia-pdf', name: 'Guia.pdf', x: 112, y: 500, pos_x: 112, pos_y: 500 } as any,
    ];

    // Intentar soltar 'guia-pdf' en (66, 445) -> snap es (112, 404) que está ocupada por 'resumen-csv'
    const snappedDrop = desktopStore.snapToGrid(66, 445);
    expect(snappedDrop.x).toBe(112);
    expect(snappedDrop.y).toBe(404);
    expect(desktopStore.isCellOccupied(snappedDrop.x, snappedDrop.y, existingItems, 'guia-pdf')).toBe(true);

    // En cambio, soltar en una celda libre como (204, 404) sí está permitido
    const freeDrop = desktopStore.snapToGrid(204, 404);
    expect(desktopStore.isCellOccupied(freeDrop.x, freeDrop.y, existingItems, 'guia-pdf')).toBe(false);
  });
});
