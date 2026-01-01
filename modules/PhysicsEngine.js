
window.PhysicsEngine = class {
    constructor(targetElement) {
        this.element = targetElement;
        this.startY = 0;
        this.currentY = 0;
        this.isDragging = false;

        this.init();
    }

    init() {
        this.element.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        this.element.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        this.element.addEventListener('touchend', () => this.onTouchEnd());

        // Mouse fallback for testing
        this.element.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', () => this.onTouchEnd());
    }

    // Input Handlers
    onTouchStart(e) {
        // Only trigger if at top of scroll
        if (this.element.scrollTop > 0) return;
        this.startY = e.touches[0].clientY;
        this.isDragging = true;
    }

    onMouseDown(e) {
        if (this.element.scrollTop > 0) return;
        this.startY = e.clientY;
        this.isDragging = true;
    }

    onTouchMove(e) {
        if (!this.isDragging) return;
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        const deltaY = y - this.startY;

        // Apply Damping Logic: Math.sign(deltaY) * Math.pow(Math.abs(deltaY), 0.7)
        if (deltaY > 0) { // Only pull down
            e.preventDefault(); // Prevent native scroll
            const dampened = Math.sign(deltaY) * Math.pow(Math.abs(deltaY), 0.7);

            // Visual Transform
            this.element.style.transform = `translateY(${dampened}px)`;
        }
    }

    onMouseMove(e) {
        this.onTouchMove(e);
    }

    onTouchEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;

        // Snap back
        this.element.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        this.element.style.transform = 'translateY(0)';

        // Remove transition after it's done so future drags are instant
        setTimeout(() => {
            this.element.style.transition = '';
        }, 400);
    }
}
