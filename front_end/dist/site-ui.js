"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initInteractiveUi = initInteractiveUi;
function initInteractiveUi() {
    const body = document.body;
    if (!body)
        return;
    const cursor = document.querySelector('.cursor');
    const ring = document.querySelector('.cursor-ring');
    const pointerTargets = document.querySelectorAll('a, button, input, select, textarea, .interactive');
    if (cursor && ring) {
        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let cursorX = mouseX;
        let cursorY = mouseY;
        document.addEventListener('mousemove', (event) => {
            mouseX = event.clientX;
            mouseY = event.clientY;
        });
        const animate = () => {
            cursorX += (mouseX - cursorX) * 0.2;
            cursorY += (mouseY - cursorY) * 0.2;
            cursor.style.left = `${cursorX}px`;
            cursor.style.top = `${cursorY}px`;
            ring.style.left = `${cursorX}px`;
            ring.style.top = `${cursorY}px`;
            requestAnimationFrame(animate);
        };
        animate();
    }
    pointerTargets.forEach((element) => {
        element.addEventListener('mouseenter', () => {
            cursor?.classList.add('big');
            ring?.classList.add('big');
        });
        element.addEventListener('mouseleave', () => {
            cursor?.classList.remove('big');
            ring?.classList.remove('big');
        });
    });
    document.querySelectorAll('form[data-validate]').forEach((form) => {
        form.addEventListener('submit', (event) => {
            const requiredInputs = form.querySelectorAll('[required]');
            let isValid = true;
            requiredInputs.forEach((input) => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.classList.add('is-invalid');
                }
                else {
                    input.classList.remove('is-invalid');
                }
            });
            if (!isValid) {
                event.preventDefault();
                const message = form.querySelector('[data-form-message]');
                if (message) {
                    message.textContent = 'Veuillez remplir les champs obligatoires avant de continuer.';
                }
            }
        });
    });
}
window.addEventListener('DOMContentLoaded', () => {
    initInteractiveUi();
});
