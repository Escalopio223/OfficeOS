<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import StickyNote from '@/components/desktop/StickyNote.vue';

const authStore = useAuthStore();

const userInput = ref('');
const passInput = ref('');

function handleSubmit() {
  authStore.login(userInput.value, passInput.value);
}

function handleFillCredentials() {
  userInput.value = authStore.defaultCredentials.user;
  passInput.value = authStore.defaultCredentials.pass;
}
</script>

<template>
  <div class="login-overlay">
    <div class="login-card">
      <div class="avatar-circle">
        <span>👤</span>
      </div>

      <h1 class="system-title" aria-label="OogleOS">
        <span class="letter-blue font-size-xl">O</span><span class="letter-red">o</span><span class="letter-yellow">g</span><span class="letter-green">l</span><span class="letter-red">e</span><span class="os-tag font-size-xl">OS</span>
      </h1>

      <form class="login-form" @submit.prevent="handleSubmit">
        <div class="input-group">
          <label for="username">Usuario</label>
          <input
            id="username"
            v-model="userInput"
            type="text"
            placeholder="usuario@officeos.com"
            autocomplete="off"
            required
          />
        </div>

        <div class="input-group">
          <label for="password">Contraseña</label>
          <input
            id="password"
            v-model="passInput"
            type="password"
            placeholder="••••••••••••"
            required
          />
        </div>

        <p v-if="authStore.errorMsg" class="error-text">
          {{ authStore.errorMsg }}
        </p>

        <button type="submit" class="btn-submit">
          Iniciar Sesión
        </button>
      </form>

      <!-- Post-it pegado a la esquina inferior derecha de la tarjeta -->
      <div 
        class="sticky-anchor" 
        title="Clic para autocompletar credenciales"
        @click="handleFillCredentials"
      >
        <StickyNote
          :user="authStore.defaultCredentials.user"
          :pass="authStore.defaultCredentials.pass"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Product+Sans&display=swap');

.login-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(17, 17, 27, 0.75);
  backdrop-filter: blur(8px);
  z-index: 5000;
  overflow: visible;
}

.login-card {
  position: relative;
  overflow: visible !important; /* Vital para que el post-it no quede recortado */
  width: 360px;
  background: #181825;
  border: 1px solid #313244;
  border-radius: 12px;
  padding: 32px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
}

/* Posición del Post-it saliendo por la esquina inferior derecha */
.sticky-anchor {
  position: absolute;
  bottom: -170px;
  right: -55px;
  z-index: 5001;
  cursor: pointer;
  transform: rotate(5deg);
  transition: transform 0.15s ease, filter 0.15s ease;
  user-select: none;
}

.sticky-anchor:hover {
  transform: rotate(2deg) scale(1.12);
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4));
}

.avatar-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #313244;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin-bottom: 16px;
  border: 2px solid #45475a;
}

.system-title {
  display: inline-flex;
  align-items: baseline;
  font-family: 'Product Sans', 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.5px;
  line-height: 1;
  user-select: none;
  margin: 0 0 20px 0;
  padding: 0;
}

.font-size-xl { font-size: 2rem; }
.system-title .letter-blue   { color: #4285F4; }
.system-title .letter-red    { color: #EA4335; }
.system-title .letter-yellow { color: #FBBC05; }
.system-title .letter-green  { color: #34A853; }
.system-title .os-tag {
  color: #9aa0a6;
  font-weight: 800;
  letter-spacing: 0.5px;
  margin-left: 2px;
}

.login-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-group label {
  color: #a6adc8;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.input-group input {
  background: #11111b;
  border: 1px solid #313244;
  border-radius: 6px;
  padding: 10px 12px;
  color: #cdd6f4;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.input-group input:focus {
  border-color: #89b4fa;
}

.error-text {
  color: #f38ba8;
  font-size: 12px;
  text-align: center;
  margin-top: -4px;
}

.btn-submit {
  background: #89b4fa;
  color: #11111b;
  border: none;
  border-radius: 6px;
  padding: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 8px;
  transition: opacity 0.2s;
}

.btn-submit:hover {
  opacity: 0.9;
}
</style>