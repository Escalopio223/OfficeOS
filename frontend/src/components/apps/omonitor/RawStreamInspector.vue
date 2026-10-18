<script setup lang="ts">
import { ref, computed } from 'vue';
import { useOmonitorStore } from '@/stores/omonitorStore';

const omonitor = useOmonitorStore();
const copied = ref(false);

const formattedJson = computed(() => {
  return omonitor.lastRawJson || '// Esperando datos del canal SSE...';
});

async function copyToClipboard() {
  if (!omonitor.lastRawJson) return;
  try {
    await navigator.clipboard.writeText(omonitor.lastRawJson);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // Fallback
  }
}
</script>

<template>
  <aside class="raw-inspector-panel">
    <div class="inspector-header">
      <div class="inspector-title-group">
        <span class="inspector-badge">&lt;/&gt; SSE Inspector</span>
        <span class="inspector-endpoint">GET /api/system/stream</span>
      </div>
      <div class="inspector-actions">
        <button
          class="btn-copy"
          :class="{ copied }"
          @click="copyToClipboard"
          title="Copiar JSON crudo"
        >
          <span v-if="copied">✓ Copiado</span>
          <span v-else>📋 Copiar</span>
        </button>
        <button
          class="btn-close"
          @click="omonitor.toggleRawInspector"
          title="Cerrar inspector"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Metadatos rápidos del tick actual -->
    <div v-if="omonitor.currentMetrics" class="inspector-metadata-bar">
      <div class="meta-item">
        <span class="meta-label">Epoch:</span>
        <span class="meta-val">{{ omonitor.currentMetrics.timestamp }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Event Loop Lag:</span>
        <span class="meta-val">{{ omonitor.currentMetrics.eventLoopLagMs }}ms</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Heap Used:</span>
        <span class="meta-val">{{ (omonitor.currentMetrics.memory.processHeapUsed / 1024 / 1024).toFixed(2) }} MB</span>
      </div>
    </div>

    <!-- Visor de código JSON crudo -->
    <div class="inspector-body">
      <pre class="json-code"><code>{{ formattedJson }}</code></pre>
    </div>

    <div class="inspector-footer">
      <span class="status-indicator" :class="{ online: omonitor.isConnected }">
        ● {{ omonitor.isConnected ? 'Stream Activo (2s Interval)' : 'Desconectado' }}
      </span>
      <span class="footer-note">Cero IP tracking</span>
    </div>
  </aside>
</template>

<style scoped>
.raw-inspector-panel {
  width: 380px;
  max-width: 100%;
  background: #11111b;
  border-left: 1px solid #313244;
  display: flex;
  flex-direction: column;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.45);
  animation: slide-in 0.22s ease-out;
}

@keyframes slide-in {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.inspector-header {
  padding: 12px 14px;
  background: #181825;
  border-bottom: 1px solid #313244;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.inspector-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.inspector-badge {
  font-size: 11px;
  font-weight: 700;
  color: #12b5cb;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.inspector-endpoint {
  font-size: 11px;
  font-family: monospace;
  color: #a6adc8;
}

.inspector-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-copy {
  background: #313244;
  border: 1px solid #45475a;
  color: #cdd6f4;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-copy:hover {
  background: #45475a;
  color: #ffffff;
}

.btn-copy.copied {
  background: #a6e3a1;
  color: #11111b;
  font-weight: 600;
  border-color: #a6e3a1;
}

.btn-close {
  background: transparent;
  border: none;
  color: #a6adc8;
  font-size: 14px;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  background: #313244;
  color: #f38ba8;
}

.inspector-metadata-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 14px;
  background: #1e1e2e;
  border-bottom: 1px solid #313244;
  font-size: 11px;
}

.meta-item {
  display: flex;
  gap: 4px;
}

.meta-label {
  color: #6c7086;
}

.meta-val {
  color: #fab387;
  font-family: monospace;
}

.inspector-body {
  flex: 1;
  overflow: auto;
  padding: 12px 14px;
  background: #11111b;
}

.json-code {
  margin: 0;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.5;
  color: #cdd6f4;
  white-space: pre-wrap;
  word-break: break-all;
}

.inspector-footer {
  padding: 8px 14px;
  background: #181825;
  border-top: 1px solid #313244;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.status-indicator {
  color: #f38ba8;
  font-weight: 500;
}

.status-indicator.online {
  color: #a6e3a1;
}

.footer-note {
  color: #6c7086;
  font-size: 10px;
}
</style>
