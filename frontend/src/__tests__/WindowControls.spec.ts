import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import WindowControls from '@/components/common/WindowControls.vue';
import { useWindowStore } from '@/stores/windowStore';

describe('WindowControls Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renderiza los tres botones de control con sus títulos y roles', () => {
    const wrapper = mount(WindowControls, {
      props: {
        windowId: 'opaint',
        isMaximized: false,
      },
    });

    const buttons = wrapper.findAll('button.win-btn');
    expect(buttons.length).toBe(3);

    expect(wrapper.find('button.minimize').exists()).toBe(true);
    expect(wrapper.find('button.maximize').exists()).toBe(true);
    expect(wrapper.find('button.close').exists()).toBe(true);
  });

  it('dispara la acción de minimizar en el store al hacer clic', async () => {
    const winStore = useWindowStore();
    const wrapper = mount(WindowControls, {
      props: {
        windowId: 'opaint',
        isMaximized: false,
      },
    });

    winStore.windows['opaint'].isMinimized = false;
    await wrapper.find('button.minimize').trigger('click');
    expect(winStore.windows['opaint'].isMinimized).toBe(true);
  });

  it('dispara maximizar y alterna el estado', async () => {
    const winStore = useWindowStore();
    const wrapper = mount(WindowControls, {
      props: {
        windowId: 'opaint',
        isMaximized: false,
      },
    });

    winStore.windows['opaint'].isMaximized = false;
    await wrapper.find('button.maximize').trigger('click');
    expect(winStore.windows['opaint'].isMaximized).toBe(true);
  });

  it('cierra la ventana al hacer clic en close', async () => {
    const winStore = useWindowStore();
    winStore.windows['opaint'].isOpen = true;

    const wrapper = mount(WindowControls, {
      props: {
        windowId: 'opaint',
        isMaximized: false,
      },
    });

    await wrapper.find('button.close').trigger('click');
    expect(winStore.windows['opaint'].isOpen).toBe(false);
  });
});
