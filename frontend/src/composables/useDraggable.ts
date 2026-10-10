import { ref } from 'vue';

export function useDraggable(initialX = 80, initialY = 40) {
    const x = ref(initialX);
    const y = ref(initialY);
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    function startDrag(e: MouseEvent, isMaximized: boolean) {
        if (isMaximized) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = x.value;
        initialTop = y.value;

        window.addEventListener('mousemove', onDrag);
        window.addEventListener('mouseup', stopDrag);
    }

    function onDrag(e: MouseEvent) {
        if (!isDragging) return;

        const winW = 820;
        const headerH = 42;
        const taskbarH = 50;

        // Límites absolutos respecto a la ventana del navegador
        const maxW = Math.max(0, window.innerWidth - winW);
        const maxH = Math.max(0, window.innerHeight - taskbarH - headerH);

        const nextX = initialLeft + (e.clientX - startX);
        const nextY = initialTop + (e.clientY - startY);

        x.value = Math.max(0, Math.min(nextX, maxW));
        y.value = Math.max(0, Math.min(nextY, maxH));
    }

    function stopDrag() {
        isDragging = false;
        window.removeEventListener('mousemove', onDrag);
        window.removeEventListener('mouseup', stopDrag);
    }

    return { x, y, startDrag };
}