import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import StartMenu from '@/components/desktop/StartMenu.vue';
import { useWindowStore } from '@/stores/windowStore';
import { useAuthStore } from '@/stores/authStore';

describe('StartMenu.vue - Menú de Inicio estilo Windows', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renderiza la barra de búsqueda y todas las aplicaciones disponibles', () => {
    const wrapper = mount(StartMenu);

    expect(wrapper.find('.search-input').exists()).toBe(true);
    const appCards = wrapper.findAll('.app-card');
    expect(appCards.length).toBe(8);

    const text = wrapper.text();
    expect(text).toContain('Oxplorer');
    expect(text).toContain('Oplanner');
    expect(text).toContain('Omonitor');
    expect(text).toContain('Onotes');
    expect(text).toContain('Osheets');
    expect(text).toContain('Opaint');
    expect(text).toContain('Opdf');
    expect(text).toContain('Opics');
  });

  it('filtra las aplicaciones al escribir en el buscador', async () => {
    const wrapper = mount(StartMenu);
    const input = wrapper.find('.search-input');

    await input.setValue('paint');
    const filteredCards = wrapper.findAll('.app-card');
    expect(filteredCards.length).toBe(1);
    expect(wrapper.text()).toContain('Opaint');
    expect(wrapper.text()).not.toContain('Oxplorer');

    // Limpiar búsqueda
    await input.setValue('');
    expect(wrapper.findAll('.app-card').length).toBe(8);
  });

  it('muestra mensaje de estado vacío cuando no hay coincidencias', async () => {
    const wrapper = mount(StartMenu);
    const input = wrapper.find('.search-input');

    await input.setValue('app_inexistente_xyz');
    expect(wrapper.findAll('.app-card').length).toBe(0);
    expect(wrapper.find('.no-apps-found').exists()).toBe(true);
  });

  it('abre la ventana correspondiente y emite close al hacer clic en una aplicación', async () => {
    const winStore = useWindowStore();
    const openWindowSpy = vi.spyOn(winStore, 'openWindow');

    const wrapper = mount(StartMenu);
    const oplannerCard = wrapper.findAll('.app-card').find((c) => c.text().includes('Oplanner'));
    expect(oplannerCard).toBeDefined();

    await oplannerCard?.trigger('click');

    expect(openWindowSpy).toHaveBeenCalledWith('oplanner');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('emite close al pulsar la tecla Escape', async () => {
    const wrapper = mount(StartMenu);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('cierra sesión y emite close al pulsar el botón de apagado/salir', async () => {
    const authStore = useAuthStore();
    authStore.isAuthenticated = true;

    const wrapper = mount(StartMenu);
    const powerBtn = wrapper.find('.btn-power');
    expect(powerBtn.exists()).toBe(true);

    await powerBtn.trigger('click');

    expect(authStore.isAuthenticated).toBe(false);
    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
