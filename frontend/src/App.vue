<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore';
import StickyNote from '@/components/desktop/StickyNote.vue';
import LoginModal from '@/components/desktop/LoginModal.vue';
import oogleLogoSvg from '@/assets/oogle-logo.svg';

const authStore = useAuthStore();
</script>

<template>
  <div class="office-room">
    <!-- Monitor físico -->
    <div class="monitor-setup">
      <!-- Bisel exterior -->
      <div class="monitor-frame">
        <!-- Pantalla LCD interior -->
        <div class="screen-display">
          <LoginModal v-if="!authStore.isAuthenticated" />

          <main class="desktop-workspace">
            <div v-if="authStore.isAuthenticated" class="welcome-banner">
            </div>
          </main>

          <footer class="taskbar">
            <!-- <div class="start-btn">Inicio</div> -->
             <button class="oogle-start-btn" aria-label="Menú Oogle">
               <img :src="oogleLogoSvg" alt="Oogle" class="oogle-btn-icon" />
             </button>
            <div class="taskbar-status">
            </div>
          </footer>
        </div>

        <!-- Anclaje del Post-it -->
        <div class="sticky-anchor">
          <StickyNote
            :user="authStore.defaultCredentials.user"
            :pass="authStore.defaultCredentials.pass"
          />
        </div>
      </div>

      <!-- Cuello y peana -->
      <div class="monitor-neck"></div>
      <div class="monitor-base"></div>
    </div>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body,
html {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #dcd5c5;
}
</style>

<style scoped>
/* Fondo beige cálido / oficina */
.office-room {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 50% 35%, #f2ede4 0%, #d8d0bf 100%);
  padding: 24px;
}

.monitor-setup {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.monitor-frame {
  position: relative;
  width: 90vw;
  max-width: 1280px;
  height: calc(90vw * 9 / 16);
  max-height: 720px;
  background: #111116;
  border: 14px solid #1a1a22;
  border-bottom: 26px solid #1a1a22;
  border-radius: 10px;
  box-shadow:
    0 35px 70px rgba(0, 0, 0, 0.45),
    0 10px 25px rgba(0, 0, 0, 0.25);
  overflow: visible !important;
}

.screen-display {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 50% 50%, #1e1e2e 0%, #11111b 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 2px;
}

.desktop-workspace {
flex: 1;
  position: relative;
  /* Sustituye oogle-bg.jpg por el nombre exacto con el que guardaste el archivo */
  background-image: url('@/assets/oogle.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  overflow: hidden;
}

.welcome-banner {
  padding: 24px;
  color: #a6adc8;
  font-size: 14px;
}

.taskbar {
  height: 50px;
  background-color: #11111b;
  border-top: 1px solid #313244;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  color: #a6adc8;
  font-size: 12px;
  user-select: none;
}

.start-btn {
  background: #313244;
  padding: 4px 10px;
  border-radius: 4px;
  font-weight: 600;
  color: #cdd6f4;
  cursor: pointer;
}

.taskbar-status {
  font-size: 11px;
  color: #6c7086;
}

.sticky-anchor {
  position: absolute;
  bottom: -180px;
  right: 120px;
  z-index: 99999;
  pointer-events: auto;
}

.monitor-neck {
  width: 130px;
  height: 130px;
  background: linear-gradient(to right, #121216, #242430, #121216);
  box-shadow: inset 0 6px 12px rgba(0, 0, 0, 0.5);
}

.monitor-base {
  width: 320px;
  height: 14px;
  background: #1a1a22;
  border-radius: 4px 4px 1px 1px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
}

.oogle-start-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  cursor: pointer;
  padding: 4px;
  transition: all 0.2s ease;
}

.oogle-start-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  transform: scale(1.08);
  box-shadow: 0 0 10px rgba(66, 133, 244, 0.4);
}

.oogle-btn-icon {
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}
</style>