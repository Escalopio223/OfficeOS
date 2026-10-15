<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    mode?: 'unlock' | 'create-secure' | 'set-password' | 'remove-password'
    title?: string
    folderName?: string
    initialName?: string
    errorMessage?: string
    loading?: boolean
  }>(),
  {
    mode: 'unlock',
    title: '',
    folderName: '',
    initialName: 'Carpeta Segura',
    errorMessage: '',
    loading: false,
  }
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', payload: { name: string; password: string }): void
}>()

const nameInput = ref('')
const passwordInput = ref('')
const nameInputRef = ref<HTMLInputElement | null>(null)
const passwordInputRef = ref<HTMLInputElement | null>(null)

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      nameInput.value = props.initialName
      passwordInput.value = ''
      nextTick(() => {
        if (props.mode === 'create-secure' && nameInputRef.value) {
          nameInputRef.value.focus()
          nameInputRef.value.select()
        } else if (passwordInputRef.value) {
          passwordInputRef.value.focus()
        }
      })
    }
  },
  { immediate: true }
)

function onCancel() {
  emit('close')
}

function onConfirm() {
  if (props.loading) return
  if (props.mode === 'create-secure' && !nameInput.value.trim()) return
  if (!passwordInput.value) return

  emit('confirm', {
    name: nameInput.value.trim(),
    password: passwordInput.value,
  })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-backdrop" @click="onCancel">
      <div class="name-modal security-modal" @click.stop>
        <div class="modal-header">
          <div class="modal-title-wrap">
            <span class="modal-icon">{{ mode === 'remove-password' ? '🔓' : '🔒' }}</span>
            <h3 class="modal-title">
              {{ title || (mode === 'create-secure' ? 'Nueva Carpeta Segura' : mode === 'remove-password' ? 'Quitar Protección' : mode === 'set-password' ? 'Proteger Carpeta' : 'Carpeta Protegida') }}
            </h3>
          </div>
        </div>

        <div class="modal-body">
          <template v-if="mode === 'create-secure'">
            <label class="modal-label">Nombre de la carpeta:</label>
            <input
              ref="nameInputRef"
              v-model="nameInput"
              type="text"
              class="modal-input"
              placeholder="Nombre..."
              @keydown.enter.prevent="passwordInputRef?.focus()"
            />
          </template>

          <template v-if="folderName && mode !== 'create-secure'">
            <div class="folder-target-badge">
              <span class="badge-icon">📁</span>
              <span class="badge-name">{{ folderName }}</span>
            </div>
          </template>

          <label class="modal-label">
            {{ mode === 'remove-password' ? 'Contraseña actual:' : mode === 'set-password' ? 'Nueva contraseña:' : 'Contraseña:' }}
          </label>
          <input
            ref="passwordInputRef"
            v-model="passwordInput"
            type="password"
            class="modal-input"
            :placeholder="mode === 'remove-password' ? 'Introduce la contraseña actual...' : 'Introduce la contraseña...'"
            @keydown.enter.prevent="onConfirm"
          />

          <div v-if="errorMessage" class="modal-error">
            {{ errorMessage }}
          </div>
        </div>

        <div class="modal-actions">
          <button class="modal-btn secondary" type="button" @click="onCancel">
            Cancelar
          </button>
          <button
            class="modal-btn primary"
            type="button"
            :disabled="loading || !passwordInput || (mode === 'create-secure' && !nameInput.trim())"
            @click="onConfirm"
          >
            {{ loading ? 'Verificando...' : mode === 'create-secure' ? 'Crear' : mode === 'remove-password' ? 'Desproteger' : mode === 'set-password' ? 'Proteger' : 'Acceder' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(5, 7, 15, 0.72);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999999;
}

.name-modal {
  width: 20vw;
  min-width: 320px;
  background: rgba(18, 24, 38, 0.94);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 14px;
  box-shadow: 
    0 25px 60px rgba(0, 0, 0, 0.75), 
    0 0 35px rgba(56, 189, 248, 0.15),
    inset 0 1px 1px rgba(255, 255, 255, 0.2);
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  animation: modalPop 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  gap: 14px;
}

@keyframes modalPop {
  from {
    opacity: 0;
    transform: scale(0.93) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-icon {
  font-size: 20px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
}

.modal-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #f8fafc;
  letter-spacing: -0.01em;
}

.folder-target-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  margin-bottom: 4px;
}

.badge-icon {
  font-size: 13px;
}

.badge-name {
  font-size: 12px;
  color: #cbd5e1;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.modal-label {
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.modal-input {
  background: rgba(10, 15, 29, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  color: #ffffff;
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;
}

.modal-input:focus {
  border-color: #38bdf8;
  background: rgba(10, 15, 29, 0.9);
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.25);
}

.modal-error {
  font-size: 12px;
  color: #f87171;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 6px;
  padding: 4px 8px;
  margin-top: 2px;
  animation: modalPop 0.15s ease-out;
}

.modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}

.modal-btn {
  padding: 7px 15px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
}

.modal-btn.secondary {
  background: rgba(255, 255, 255, 0.07);
  color: #cbd5e1;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.modal-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}

.modal-btn.primary {
  background: #0284c7;
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(2, 132, 199, 0.35);
}

.modal-btn.primary:hover:not(:disabled) {
  background: #0369a1;
  box-shadow: 0 4px 14px rgba(2, 132, 199, 0.5);
}

.modal-btn.primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}
</style>
