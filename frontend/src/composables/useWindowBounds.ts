import { ref } from 'vue';

export function useWindowBounds(
    initialX = 80,
    initialY = 40,
    initialW = 840,
    initialH = 520,
    minW = 480,
    minH = 320
) {
    const x = ref(initialX);
    const y = ref(initialY);
    const width = ref(initialW);
    const height = ref(initialH);

    const TASKBAR_HEIGHT = 50;

    // --- DRAG ---
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    function startDrag(e: MouseEvent, isMaximized: boolean) {
        if (isMaximized || e.button !== 0) return;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        initialLeft = x.value;
        initialTop = y.value;

        window.addEventListener('mousemove', onDragMove);
        window.addEventListener('mouseup', stopDrag);
    }

    function onDragMove(e: MouseEvent) {
        if (!isDragging) return;
        const maxW = Math.max(0, window.innerWidth - width.value);
        const maxH = Math.max(0, window.innerHeight - TASKBAR_HEIGHT - 40);

        const nextX = initialLeft + (e.clientX - dragStartX);
        const nextY = initialTop + (e.clientY - dragStartY);

        x.value = Math.max(0, Math.min(nextX, maxW));
        y.value = Math.max(0, Math.min(nextY, maxH));
    }

    function stopDrag() {
        isDragging = false;
        window.removeEventListener('mousemove', onDragMove);
        window.removeEventListener('mouseup', stopDrag);
    }

    // --- RESIZE ---
    let resizeDir = '';
    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;
    let startPosX = 0;
    let startPosY = 0;

    function startResize(e: MouseEvent, direction: string, isMaximized: boolean) {
        if (isMaximized || e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        resizeDir = direction;
        startX = e.clientX;
        startY = e.clientY;
        startW = width.value;
        startH = height.value;
        startPosX = x.value;
        startPosY = y.value;

        window.addEventListener('mousemove', onResizeMove);
        window.addEventListener('mouseup', stopResize);
    }

    function onResizeMove(e: MouseEvent) {
        if (!resizeDir) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const maxAvailableH = window.innerHeight - TASKBAR_HEIGHT;

        // Derecha
        if (resizeDir.includes('e')) {
            const newW = Math.min(window.innerWidth - x.value, Math.max(minW, startW + deltaX));
            width.value = newW;
        }
        // Izquierda
        if (resizeDir.includes('w')) {
            const rawW = startW - deltaX;
            if (rawW >= minW) {
                const newX = Math.max(0, startPosX + deltaX);
                width.value = startW + (startPosX - newX);
                x.value = newX;
            }
        }
        // Abajo
        if (resizeDir.includes('s')) {
            const maxH = maxAvailableH - y.value;
            const newH = Math.min(maxH, Math.max(minH, startH + deltaY));
            height.value = newH;
        }
        // Arriba
        if (resizeDir.includes('n')) {
            const rawH = startH - deltaY;
            if (rawH >= minH) {
                const newY = Math.max(0, startPosY + deltaY);
                height.value = startH + (startPosY - newY);
                y.value = newY;
            }
        }
    }

    function stopResize() {
        resizeDir = '';
        window.removeEventListener('mousemove', onResizeMove);
        window.removeEventListener('mouseup', stopResize);
    }

    return {
        x,
        y,
        width,
        height,
        startDrag,
        startResize
    };
}