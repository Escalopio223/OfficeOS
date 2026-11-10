<script setup lang="ts">
import { ref } from 'vue';
import { useWindowStore } from '@/stores/windowStore';
import {
  useCustomizationStore,
  WALLPAPER_PRESETS,
  TASKBAR_COLOR_PRESETS,
  FONT_PRESETS,
} from '@/stores/customizationStore';
import { useWindowBounds } from '@/composables/useWindowBounds';
import WindowControls from '@/components/common/WindowControls.vue';
import customizationSvg from '@/assets/customization.svg';

const emit = defineEmits<{
  (e: 'reorganize-grid'): void;
}>();

const winStore = useWindowStore();
const customStore = useCustomizationStore();

const { x, y, width, height, startDrag, startResize } = useWindowBounds(180, 90, 780, 540);
const activeTab = ref<'theme' | 'wallpaper' | 'taskbar' | 'typography'>('wallpaper');

function selectWallpaper(id: string) {
  customStore.setWallpaper(id);
}

function selectTheme(theme: 'dark' | 'light') {
  customStore.setTheme(theme);
}

function selectTaskbarColor(color: string) {
  customStore.setTaskbarColor(color);
}

function selectFont(id: string) {
  customStore.setFontFamily(id);
}
</script>

<template>
  <div
    v-show="!winStore.windows['customization']?.isMinimized"
    class="customization-window glass-panel"
    :class="{ 'is-maximized': winStore.windows['customization']?.isMaximized }"
    :style="{
      left: winStore.windows['customization']?.isMaximized ? '0' : `${x}px`,
      top: winStore.windows['customization']?.isMaximized ? '0' : `${y}px`,
      width: winStore.windows['customization']?.isMaximized ? '100%' : `${width}px`,
      height: winStore.windows['customization']?.isMaximized ? 'calc(100% - 50px)' : `${height}px`,
      zIndex: winStore.windows['customization']?.zIndex,
    }"
    @mousedown="winStore.focusWindow('customization')"
  >
    <!-- Barra superior de la ventana -->
    <header class="window-header" @mousedown="startDrag">
      <div class="window-title-group">
        <img :src="customizationSvg" alt="Personalización" class="window-icon" draggable="false" />
        <span class="window-title">Personalización del Sistema</span>
      </div>
      <WindowControls
        window-id="customization"
        :is-maximized="Boolean(winStore.windows['customization']?.isMaximized)"
      />
    </header>

    <!-- Cuerpo con Navegación Lateral y Contenido -->
    <div class="window-body">
      <!-- Barra lateral de navegación -->
      <nav class="custom-sidebar">
        <button
          class="sidebar-nav-item"
          :class="{ active: activeTab === 'wallpaper' }"
          @click="activeTab = 'wallpaper'"
        >
          <span class="nav-icon">🖼️</span>
          <span>Fondo de Pantalla</span>
        </button>

        <button
          class="sidebar-nav-item"
          :class="{ active: activeTab === 'theme' }"
          @click="activeTab = 'theme'"
        >
          <span class="nav-icon">🌓</span>
          <span>Tema (Claro / Oscuro)</span>
        </button>

        <button
          class="sidebar-nav-item"
          :class="{ active: activeTab === 'taskbar' }"
          @click="activeTab = 'taskbar'"
        >
          <span class="nav-icon">📊</span>
          <span>Barra de Tareas</span>
        </button>

        <button
          class="sidebar-nav-item"
          :class="{ active: activeTab === 'typography' }"
          @click="activeTab = 'typography'"
        >
          <span class="nav-icon">🔤</span>
          <span>Tipografía</span>
        </button>

        <div class="sidebar-spacer"></div>

        <button class="sidebar-reset-btn" @click="customStore.resetDefaults">
          ↺ Restaurar por defecto
        </button>
      </nav>

      <!-- Panel de Contenido de la Pestaña Activa -->
      <main class="custom-content">
        <!-- 1. Pestaña: FONDOS DE PANTALLA -->
        <section v-if="activeTab === 'wallpaper'" class="tab-section">
          <div class="section-title-wrap">
            <h2 class="section-heading">Fondos de pantalla precargados</h2>
            <p class="section-subtitle">
              Elige entre la colección de fondos artísticos y gradientes de alta fidelidad integrados en OogleOS.
            </p>
          </div>

          <div class="wallpapers-grid">
            <div
              v-for="wp in WALLPAPER_PRESETS"
              :key="wp.id"
              class="wallpaper-card"
              :class="{ selected: customStore.wallpaperId === wp.id }"
              @click="selectWallpaper(wp.id)"
            >
              <div
                class="wallpaper-thumb"
                :style="{ background: wp.thumbnailGradient }"
              >
                <div v-if="customStore.wallpaperId === wp.id" class="selected-badge">
                  ✓
                </div>
              </div>
              <div class="wallpaper-info">
                <span class="wallpaper-name">{{ wp.name }}</span>
                <span class="wallpaper-desc">{{ wp.description }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 2. Pestaña: TEMA (CLARO / OSCURO) -->
        <section v-else-if="activeTab === 'theme'" class="tab-section">
          <div class="section-title-wrap">
            <h2 class="section-heading">Tema del Sistema</h2>
            <p class="section-subtitle">
              Configura el modo visual global para interfaces, barras de herramientas y diálogos.
            </p>
          </div>

          <div class="theme-cards-grid">
            <!-- Modo Oscuro -->
            <div
              class="theme-card dark-preview"
              :class="{ selected: customStore.theme === 'dark' }"
              @click="selectTheme('dark')"
            >
              <div class="theme-mockup dark-mockup">
                <div class="mockup-header">
                  <div class="mockup-dots"><span></span><span></span><span></span></div>
                  <div class="mockup-bar"></div>
                </div>
                <div class="mockup-body">
                  <div class="mockup-sidebar"></div>
                  <div class="mockup-content">
                    <div class="mockup-line long"></div>
                    <div class="mockup-line short"></div>
                  </div>
                </div>
              </div>
              <div class="theme-card-footer">
                <div class="theme-label-group">
                  <span class="theme-name">🌙 Modo Oscuro</span>
                  <span class="theme-desc">Descansa la vista con tonos oscuros profundos y acentos en azul cian.</span>
                </div>
                <div v-if="customStore.theme === 'dark'" class="selected-pill">Activo</div>
              </div>
            </div>

            <!-- Modo Claro -->
            <div
              class="theme-card light-preview"
              :class="{ selected: customStore.theme === 'light' }"
              @click="selectTheme('light')"
            >
              <div class="theme-mockup light-mockup">
                <div class="mockup-header">
                  <div class="mockup-dots"><span></span><span></span><span></span></div>
                  <div class="mockup-bar"></div>
                </div>
                <div class="mockup-body">
                  <div class="mockup-sidebar"></div>
                  <div class="mockup-content">
                    <div class="mockup-line long"></div>
                    <div class="mockup-line short"></div>
                  </div>
                </div>
              </div>
              <div class="theme-card-footer">
                <div class="theme-label-group">
                  <span class="theme-name">☀️ Modo Claro</span>
                  <span class="theme-desc">Interfaces diurnas luminosas con tipografía en alto contraste.</span>
                </div>
                <div v-if="customStore.theme === 'light'" class="selected-pill">Activo</div>
              </div>
            </div>
          </div>
        </section>

        <!-- 3. Pestaña: BARRA DE TAREAS -->
        <section v-else-if="activeTab === 'taskbar'" class="tab-section">
          <div class="section-title-wrap">
            <h2 class="section-heading">Color de la Barra de Tareas</h2>
            <p class="section-subtitle">
              Personaliza el fondo de la barra de tareas inferior en tiempo real.
            </p>
          </div>

          <!-- Previsualización en vivo -->
          <div class="taskbar-live-preview">
            <span class="preview-tag">Vista previa en directo</span>
            <div
              class="preview-taskbar-bar"
              :style="{ backgroundColor: customStore.taskbarColor }"
            >
              <div class="preview-btn-mock"></div>
              <div class="preview-apps-mock">
                <div class="preview-app-pill active"></div>
                <div class="preview-app-pill"></div>
              </div>
              <div class="preview-clock-mock">12:00</div>
            </div>
          </div>

          <!-- Paleta de colores predefinidos -->
          <div class="color-palette-wrap">
            <label class="section-sublabel">Colores recomendados</label>
            <div class="color-swatches-grid">
              <button
                v-for="swatch in TASKBAR_COLOR_PRESETS"
                :key="swatch.color"
                class="swatch-btn"
                :class="{ selected: customStore.taskbarColor.toLowerCase() === swatch.color.toLowerCase() }"
                :style="{ backgroundColor: swatch.color }"
                :title="swatch.name"
                @click="selectTaskbarColor(swatch.color)"
              >
                <span v-if="customStore.taskbarColor.toLowerCase() === swatch.color.toLowerCase()" class="swatch-check">✓</span>
              </button>
            </div>
          </div>

          <!-- Selector de color personalizado -->
          <div class="custom-color-picker-box">
            <label class="section-sublabel" for="taskbar-color-input">Color personalizado (Selector HEX/RGB):</label>
            <div class="color-input-row">
              <input
                id="taskbar-color-input"
                :value="customStore.taskbarColor"
                type="color"
                class="color-native-input"
                @input="selectTaskbarColor(($event.target as HTMLInputElement).value)"
              />
              <input
                :value="customStore.taskbarColor"
                type="text"
                class="color-text-input"
                placeholder="#11111b"
                @input="selectTaskbarColor(($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
        </section>

        <!-- 4. Pestaña: TIPOGRAFÍA -->
        <section v-else-if="activeTab === 'typography'" class="tab-section">
          <div class="section-title-wrap">
            <h2 class="section-heading">Tipografía del Sistema</h2>
            <p class="section-subtitle">
              Cambia la fuente de texto aplicada en ventanas, menús y nombres de iconos del escritorio.
            </p>
          </div>

          <div class="font-list">
            <div
              v-for="font in FONT_PRESETS"
              :key="font.id"
              class="font-card"
              :class="{ selected: customStore.fontFamilyId === font.id }"
              @click="selectFont(font.id)"
            >
              <div class="font-card-header">
                <span class="font-name" :style="{ fontFamily: font.fontFamily }">{{ font.name }}</span>
                <span v-if="customStore.fontFamilyId === font.id" class="selected-pill">Seleccionada</span>
              </div>
              <p class="font-desc">{{ font.description }}</p>
              <div class="font-preview-text" :style="{ fontFamily: font.fontFamily }">
                OfficeOS: Sistema operativo inteligente y fluido • ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 1234567890
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>

    <!-- Tirador de redimensionado -->
    <div class="window-resize-handle" @mousedown="startResize"></div>
  </div>
</template>

<style scoped>
.customization-window {
  position: absolute;
  min-width: 620px;
  min-height: 440px;
  border-radius: 12px;
  background: rgba(18, 22, 34, 0.94);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65), 0 0 1px rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}

.customization-window.is-maximized {
  border-radius: 0;
  border: none;
}

.window-header {
  height: 42px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  cursor: grab;
}

.window-header:active {
  cursor: grabbing;
}

.window-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.window-icon {
  width: 20px;
  height: 20px;
  pointer-events: none;
}

.window-title {
  color: #f1f5f9;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.window-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Barra lateral */
.custom-sidebar {
  width: 210px;
  background: rgba(12, 16, 26, 0.65);
  border-right: 1px solid rgba(255, 255, 255, 0.07);
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid transparent;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.sidebar-nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #f1f5f9;
}

.sidebar-nav-item.active {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.35);
  color: #38bdf8;
  font-weight: 600;
}

.nav-icon {
  font-size: 15px;
}

.sidebar-spacer {
  flex: 1;
}

.sidebar-reset-btn {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: #64748b;
  font-size: 11px;
  padding: 7px 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sidebar-reset-btn:hover {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.3);
}

/* Área de contenido */
.custom-content {
  flex: 1;
  overflow-y: auto;
  padding: 22px 24px;
}

.section-title-wrap {
  margin-bottom: 20px;
}

.section-heading {
  font-size: 17px;
  font-weight: 600;
  color: #f8fafc;
  margin: 0 0 4px 0;
}

.section-subtitle {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}

/* Pestaña: Fondos de pantalla */
.wallpapers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
}

.wallpaper-card {
  border-radius: 10px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.16s ease;
  display: flex;
  flex-direction: column;
}

.wallpaper-card:hover {
  border-color: rgba(56, 189, 248, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.4);
}

.wallpaper-card.selected {
  border-color: #38bdf8;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.3), 0 8px 20px rgba(0, 0, 0, 0.5);
}

.wallpaper-thumb {
  height: 95px;
  position: relative;
  background-size: cover;
}

.selected-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #0284c7;
  color: #ffffff;
  font-size: 12px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.wallpaper-info {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wallpaper-name {
  font-size: 12px;
  font-weight: 600;
  color: #f1f5f9;
}

.wallpaper-desc {
  font-size: 10px;
  color: #64748b;
  line-height: 1.3;
}

/* Pestaña: Tema */
.theme-cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.theme-card {
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  padding: 14px;
  cursor: pointer;
  transition: all 0.16s ease;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.theme-card:hover {
  border-color: rgba(56, 189, 248, 0.35);
  transform: translateY(-2px);
}

.theme-card.selected {
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.04);
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.25);
}

.theme-mockup {
  height: 110px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dark-mockup {
  background: #0b0f19;
}

.dark-mockup .mockup-header {
  background: #181825;
}

.dark-mockup .mockup-sidebar {
  background: #11111b;
}

.dark-mockup .mockup-line {
  background: rgba(255, 255, 255, 0.2);
}

.light-mockup {
  background: #f8fafc;
}

.light-mockup .mockup-header {
  background: #e2e8f0;
}

.light-mockup .mockup-sidebar {
  background: #cbd5e1;
}

.light-mockup .mockup-line {
  background: rgba(0, 0, 0, 0.2);
}

.mockup-header {
  height: 22px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  gap: 10px;
}

.mockup-dots {
  display: flex;
  gap: 4px;
}

.mockup-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #94a3b8;
}

.mockup-bar {
  width: 50px;
  height: 5px;
  border-radius: 3px;
  background: rgba(148, 163, 184, 0.5);
}

.mockup-body {
  flex: 1;
  display: flex;
}

.mockup-sidebar {
  width: 35px;
  height: 100%;
}

.mockup-content {
  flex: 1;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mockup-line {
  height: 6px;
  border-radius: 3px;
}

.mockup-line.long {
  width: 70%;
}

.mockup-line.short {
  width: 45%;
}

.theme-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.theme-label-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.theme-name {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
}

.theme-desc {
  font-size: 11px;
  color: #64748b;
  line-height: 1.3;
}

.selected-pill {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #0284c7;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 3px 8px;
  border-radius: 12px;
}

/* Pestaña: Barra de Tareas */
.taskbar-live-preview {
  margin-bottom: 22px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-tag {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preview-taskbar-bar {
  height: 42px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  transition: background-color 0.2s ease;
}

.preview-btn-mock {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
}

.preview-apps-mock {
  display: flex;
  gap: 6px;
}

.preview-app-pill {
  width: 60px;
  height: 22px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.12);
}

.preview-app-pill.active {
  background: rgba(56, 189, 248, 0.3);
  border: 1px solid #38bdf8;
}

.preview-clock-mock {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.section-sublabel {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #cbd5e1;
  margin-bottom: 10px;
}

.color-palette-wrap {
  margin-bottom: 22px;
}

.color-swatches-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.swatch-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.swatch-btn:hover {
  transform: scale(1.15);
}

.swatch-btn.selected {
  border-color: #38bdf8;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.4);
  transform: scale(1.1);
}

.swatch-check {
  color: #ffffff;
  font-size: 14px;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.custom-color-picker-box {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 14px;
}

.color-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-native-input {
  width: 44px;
  height: 36px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
}

.color-text-input {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  color: #f1f5f9;
  font-size: 13px;
  font-family: monospace;
  outline: none;
  width: 140px;
}

.color-text-input:focus {
  border-color: #38bdf8;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

/* Pestaña: Tipografía */
.font-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.font-card {
  border-radius: 10px;
  border: 2px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  padding: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.font-card:hover {
  border-color: rgba(56, 189, 248, 0.3);
  transform: translateY(-1px);
}

.font-card.selected {
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.04);
}

.font-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.font-name {
  font-size: 14px;
  font-weight: 600;
  color: #f8fafc;
}

.font-desc {
  font-size: 11px;
  color: #64748b;
  margin: 0;
}

.font-preview-text {
  font-size: 12px;
  color: #cbd5e1;
  background: rgba(0, 0, 0, 0.2);
  padding: 8px 10px;
  border-radius: 6px;
  margin-top: 4px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.window-resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 14px;
  height: 14px;
  cursor: nwse-resize;
}
</style>
