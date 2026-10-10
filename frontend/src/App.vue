<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore';
import LoginModal from '@/components/desktop/LoginModal.vue';
import DesktopWorkspace from '@/components/desktop/DesktopWorkspace.vue';
import Taskbar from '@/components/desktop/Taskbar.vue';

const authStore = useAuthStore();
</script>

<template>
  <div class="os-root">
    <!-- Pantalla de login (incluye el Post-it y se destruye al autenticar) -->
    <LoginModal v-if="!authStore.isAuthenticated" />

    <!-- Escritorio (solo aparece tras el login) -->
    <template v-else>
      <DesktopWorkspace />
      <Taskbar />
    </template>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  overflow: hidden;
  user-select: none;
}
</style>

<style scoped>
.os-root {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  background-color: #0b0f19;
}
</style>