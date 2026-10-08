<script setup lang="ts">
import postitSvg from '@/assets/postit.svg';
</script>

<template>
  <aside class="postit-container" aria-label="Credenciales en post-it">
    <img :src="postitSvg" alt="Post-it con credenciales" class="postit-img" />
  </aside>
</template>

<style scoped>
.postit-container {
  position: relative;
  width: 200px;
  height: 200px;
  user-select: none;
  cursor: pointer;
  transform: rotate(-1.5deg);
  transition: transform 0.2s ease, filter 0.2s ease;
  filter: drop-shadow(0 14px 22px rgba(0, 0, 0, 0.45));
}

.postit-container:hover {
  transform: rotate(0deg) scale(1.04);
}

.postit-img {
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}
</style>