import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import oogleJpg from '@/assets/oogle.jpg';

export interface WallpaperPreset {
  id: string;
  name: string;
  description: string;
  background: string;
  thumbnailGradient: string;
  isImage?: boolean;
}

export interface FontPreset {
  id: string;
  name: string;
  fontFamily: string;
  description: string;
}

export interface TaskbarColorPreset {
  name: string;
  color: string;
}

const STORAGE_KEY = 'officeos_customization_v1';

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'oogle',
    name: 'Oogle OS Galaxy',
    description: 'Fondo oficial clásico con nebulosa estelar',
    background: `url("${oogleJpg}")`,
    thumbnailGradient: 'radial-gradient(circle at 60% 40%, #4338ca 0%, #1e1b4b 60%, #030712 100%)',
    isImage: true,
  },
  {
    id: 'nebula',
    name: 'Nebulosa Cósmica',
    description: 'Explosión de púrpuras y destellos violeta',
    background: 'radial-gradient(ellipse at 20% 80%, rgba(120, 20, 220, 0.55) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(20, 150, 240, 0.5) 0%, transparent 60%), radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)',
    thumbnailGradient: 'linear-gradient(135deg, #7c3aed, #2563eb, #020617)',
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon Dark',
    description: 'Ambiente futurista synthwave con cian y magenta',
    background: 'radial-gradient(circle at 10% 20%, rgba(236, 72, 153, 0.4) 0%, transparent 50%), radial-gradient(circle at 90% 80%, rgba(6, 182, 212, 0.4) 0%, transparent 50%), linear-gradient(135deg, #09090b 0%, #030712 50%, #111827 100%)',
    thumbnailGradient: 'linear-gradient(135deg, #db2777, #0891b2, #09090b)',
  },
  {
    id: 'aurora',
    name: 'Aurora Boreal',
    description: 'Ondas luminosas de verde esmeralda y turquesa',
    background: 'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.45) 0%, transparent 60%), radial-gradient(circle at 80% 50%, rgba(99, 102, 241, 0.35) 0%, transparent 50%), linear-gradient(180deg, #022c22 0%, #064e3b 40%, #020617 100%)',
    thumbnailGradient: 'linear-gradient(135deg, #059669, #0d9488, #022c22)',
  },
  {
    id: 'sunset',
    name: 'Atardecer Índigo',
    description: 'Cálido degradado crepuscular de tonos fuego y violeta',
    background: 'radial-gradient(circle at 50% 100%, rgba(249, 115, 22, 0.45) 0%, transparent 50%), linear-gradient(180deg, #1e1b4b 0%, #312e81 40%, #4c1d95 70%, #831843 100%)',
    thumbnailGradient: 'linear-gradient(135deg, #ea580c, #7c3aed, #1e1b4b)',
  },
  {
    id: 'slate',
    name: 'Pizarra Minimal',
    description: 'Elegancia sobria monocromática estilo estudio oscuro',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #020617 100%)',
    thumbnailGradient: 'linear-gradient(135deg, #334155, #1e293b, #020617)',
  },
  {
    id: 'solar',
    name: 'Luz Solar (Claro)',
    description: 'Degradado radiante azul cielo para entornos luminosos',
    background: 'radial-gradient(circle at 15% 15%, rgba(251, 191, 36, 0.4) 0%, transparent 50%), linear-gradient(135deg, #e0f2fe 0%, #bae6fd 40%, #f0fdf4 100%)',
    thumbnailGradient: 'linear-gradient(135deg, #fef08a, #38bdf8, #bae6fd)',
  },
  {
    id: 'forest',
    name: 'Bosque Nocturno',
    description: 'Profundidad vegetal nocturna con verde pino y noche cerrada',
    background: 'radial-gradient(circle at 75% 25%, rgba(52, 211, 153, 0.35) 0%, transparent 50%), linear-gradient(160deg, #064e3b 0%, #022c22 45%, #020617 100%)',
    thumbnailGradient: 'linear-gradient(135deg, #047857, #064e3b, #020617)',
  },
];

export const TASKBAR_COLOR_PRESETS: TaskbarColorPreset[] = [
  { name: 'Predeterminado Oscuro', color: '#11111b' },
  { name: 'Azul Medianoche', color: '#0f172a' },
  { name: 'Gris Obsidiana', color: '#181825' },
  { name: 'Verde Esmeralda', color: '#064e3b' },
  { name: 'Púrpura Profundo', color: '#2e1065' },
  { name: 'Azul Cyber', color: '#083344' },
  { name: 'Rojo Carmesí', color: '#450a0a' },
  { name: 'Gris Pizarra', color: '#1e293b' },
  { name: 'Blanco Nieve (Claro)', color: '#f1f5f9' },
  { name: 'Platino Suave', color: '#e2e8f0' },
];

export const FONT_PRESETS: FontPreset[] = [
  {
    id: 'system',
    name: 'Sistema Predeterminado',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    description: 'Limpia, balanceada y nativa de Windows / macOS',
  },
  {
    id: 'inter',
    name: 'Inter Moderna',
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    description: 'Tipografía geométrica de alta legibilidad para UI',
  },
  {
    id: 'monospace',
    name: 'Consolas / Monospace',
    fontFamily: '"Consolas", "Courier New", "Fira Code", monospace',
    description: 'Estilo terminal y programación con ancho fijo',
  },
  {
    id: 'serif',
    name: 'Georgia / Serif Clásica',
    fontFamily: '"Georgia", "Times New Roman", serif',
    description: 'Elegancia editorial tradicional y cálida',
  },
  {
    id: 'friendly',
    name: 'Trebuchet / Amigable',
    fontFamily: '"Trebuchet MS", "Quicksand", sans-serif',
    description: 'Trazos suaves y estilo cercano y redondeado',
  },
];

function loadSavedSettings() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSettings(data: Record<string, any>) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export const useCustomizationStore = defineStore('customization', () => {
  const saved = loadSavedSettings();

  const theme = ref<'dark' | 'light'>(saved?.theme === 'light' ? 'light' : 'dark');
  const taskbarColor = ref<string>(saved?.taskbarColor || '#11111b');
  const wallpaperId = ref<string>(saved?.wallpaperId || 'oogle');
  const fontFamilyId = ref<string>(saved?.fontFamilyId || 'system');

  const activeWallpaper = computed(() => {
    return WALLPAPER_PRESETS.find((w) => w.id === wallpaperId.value) || WALLPAPER_PRESETS[0]!;
  });

  const activeFont = computed(() => {
    return FONT_PRESETS.find((f) => f.id === fontFamilyId.value) || FONT_PRESETS[0]!;
  });

  const wallpaperStyle = computed(() => {
    const wp = activeWallpaper.value;
    if (wp.isImage) {
      return {
        backgroundImage: wp.background,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }
    return {
      background: wp.background,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  });

  const themeClass = computed(() => {
    return theme.value === 'light' ? 'theme-light' : 'theme-dark';
  });

  const rootStyle = computed(() => {
    return {
      '--os-font-family': activeFont.value.fontFamily,
      '--os-taskbar-bg': taskbarColor.value,
    };
  });

  function persist() {
    saveSettings({
      theme: theme.value,
      taskbarColor: taskbarColor.value,
      wallpaperId: wallpaperId.value,
      fontFamilyId: fontFamilyId.value,
    });
  }

  function setTheme(newTheme: 'dark' | 'light') {
    theme.value = newTheme;
    // Si se pasa a modo claro y el color de la barra es el oscuro por defecto, sugerir tono claro o mantener
    if (newTheme === 'light' && taskbarColor.value === '#11111b') {
      taskbarColor.value = '#e2e8f0';
    } else if (newTheme === 'dark' && taskbarColor.value === '#e2e8f0') {
      taskbarColor.value = '#11111b';
    }
    persist();
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark');
  }

  function setTaskbarColor(color: string) {
    taskbarColor.value = color;
    persist();
  }

  function setWallpaper(id: string) {
    if (WALLPAPER_PRESETS.some((w) => w.id === id)) {
      wallpaperId.value = id;
      persist();
    }
  }

  function setFontFamily(id: string) {
    if (FONT_PRESETS.some((f) => f.id === id)) {
      fontFamilyId.value = id;
      persist();
    }
  }

  function resetDefaults() {
    theme.value = 'dark';
    taskbarColor.value = '#11111b';
    wallpaperId.value = 'oogle';
    fontFamilyId.value = 'system';
    persist();
  }

  return {
    theme,
    taskbarColor,
    wallpaperId,
    fontFamilyId,
    activeWallpaper,
    activeFont,
    wallpaperStyle,
    themeClass,
    rootStyle,
    setTheme,
    toggleTheme,
    setTaskbarColor,
    setWallpaper,
    setFontFamily,
    resetDefaults,
  };
});
