<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    title: string;
    currentValue: string | number;
    unit?: string;
    color?: string;
    secondaryColor?: string;
    history: number[];
    maxVal?: number;
    subtitle?: string;
    badgeText?: string;
  }>(),
  {
    unit: '',
    color: '#12b5cb',
    secondaryColor: '#34a853',
    maxVal: 100,
    subtitle: '',
    badgeText: '',
  }
);

const SVG_WIDTH = 300;
const SVG_HEIGHT = 100;
const PADDING_Y = 8;
const MAX_POINTS = 30;

// Calcular puntos SVG para <polyline> y <polygon>
const chartData = computed(() => {
  const data = props.history;
  if (!data || data.length === 0) {
    return {
      polylinePoints: '',
      areaPoints: '',
      lastX: SVG_WIDTH,
      lastY: SVG_HEIGHT - PADDING_Y,
    };
  }

  const effectiveMax = Math.max(props.maxVal, ...data, 1);
  const stepX = SVG_WIDTH / (MAX_POINTS - 1);

  // Completar siempre los 30 puntos para que la gráfica abarque todo el ancho
  // de forma uniforme y continua, sin cortes verticales bruscos ni triángulos de luz
  const paddedData = [...data];
  if (paddedData.length < MAX_POINTS) {
    const padCount = MAX_POINTS - paddedData.length;
    const initialVal = paddedData[0] ?? 0;
    const pad = new Array(padCount).fill(initialVal);
    paddedData.unshift(...pad);
  }

  const points = paddedData.map((val, idx) => {
    const clampedVal = Math.max(0, Math.min(val, effectiveMax));
    const x = Math.round(idx * stepX);
    const usableHeight = SVG_HEIGHT - PADDING_Y * 2;
    const y = Math.round(SVG_HEIGHT - PADDING_Y - (clampedVal / effectiveMax) * usableHeight);
    return { x, y };
  });

  if (points.length === 0) {
    return {
      polylinePoints: '',
      areaPoints: '',
      lastX: SVG_WIDTH,
      lastY: SVG_HEIGHT - PADDING_Y,
    };
  }

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const firstPoint = points[0]!;
  const lastPoint = points[points.length - 1]!;

  const areaPoints = `0,${SVG_HEIGHT} ${polylinePoints} ${SVG_WIDTH},${SVG_HEIGHT}`;

  return {
    polylinePoints,
    areaPoints,
    lastX: lastPoint.x,
    lastY: lastPoint.y,
  };
});

const gradientId = computed(() => `grad-${props.title.replace(/\s+/g, '-').toLowerCase()}`);
</script>

<template>
  <div class="metric-chart-card">
    <div class="chart-header">
      <div class="chart-title-group">
        <span class="chart-title">{{ title }}</span>
        <span v-if="subtitle" class="chart-subtitle">{{ subtitle }}</span>
      </div>
      <div class="chart-value-group">
        <span v-if="badgeText" class="chart-badge">{{ badgeText }}</span>
        <span class="chart-current-value" :style="{ color }">
          {{ currentValue }}<span class="chart-unit">{{ unit }}</span>
        </span>
      </div>
    </div>

    <!-- Gráfica SVG Reactiva Nativa (Sliding Window) -->
    <div class="chart-svg-container">
      <svg
        :viewBox="`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`"
        preserveAspectRatio="none"
        class="chart-svg"
      >
        <defs>
          <linearGradient :id="gradientId" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" :stop-color="color" stop-opacity="0.10" />
            <stop offset="100%" :stop-color="color" stop-opacity="0.0" />
          </linearGradient>
        </defs>

        <!-- Cuadrícula de referencia horizontal -->
        <line x1="0" y1="20" :x2="SVG_WIDTH" y2="20" class="grid-line" />
        <line x1="0" y1="50" :x2="SVG_WIDTH" y2="50" class="grid-line" />
        <line x1="0" y1="80" :x2="SVG_WIDTH" y2="80" class="grid-line" />

        <!-- Área con gradiente ultra-suave y elegante -->
        <polygon
          v-if="chartData.areaPoints"
          :points="chartData.areaPoints"
          :fill="`url(#${gradientId})`"
        />

        <!-- Línea principal del gráfico -->
        <polyline
          v-if="chartData.polylinePoints"
          :points="chartData.polylinePoints"
          fill="none"
          :stroke="color"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- Punto actual sutil en la cabeza de la serie -->
        <circle
          v-if="chartData.polylinePoints"
          :cx="chartData.lastX"
          :cy="chartData.lastY"
          r="3"
          :fill="color"
          class="pulse-point"
        />
      </svg>

      <!-- Etiquetas en el eje X -->
      <div class="chart-x-axis">
        <span>-60s</span>
        <span>-30s</span>
        <span>Ahora</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metric-chart-card {
  background: #181825;
  border: 1px solid #313244;
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  transition: border-color 0.2s ease;
}

.metric-chart-card:hover {
  border-color: #45475a;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.chart-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chart-title {
  font-size: 13px;
  font-weight: 600;
  color: #cdd6f4;
  letter-spacing: 0.3px;
}

.chart-subtitle {
  font-size: 11px;
  color: #6c7086;
}

.chart-value-group {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.chart-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #313244;
  color: #a6adc8;
}

.chart-current-value {
  font-size: 20px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.chart-unit {
  font-size: 12px;
  font-weight: 500;
  margin-left: 2px;
  color: #a6adc8;
}

.chart-svg-container {
  position: relative;
  height: 95px;
  width: 100%;
}

.chart-svg {
  width: 100%;
  height: 80px;
  overflow: visible;
}

.grid-line {
  stroke: rgba(255, 255, 255, 0.05);
  stroke-dasharray: 4, 4;
  stroke-width: 1;
}

.pulse-point {
  opacity: 0.9;
  animation: dot-breathe 2.5s infinite ease-in-out;
}

@keyframes dot-breathe {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

.chart-x-axis {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #585b70;
  margin-top: 2px;
  user-select: none;
}
</style>
