export function initInteractiveUi(): void {
  const body = document.body;
  if (!body) return;

  const cursor = document.querySelector<HTMLElement>('.cursor');
  const ring = document.querySelector<HTMLElement>('.cursor-ring');
  const pointerTargets = document.querySelectorAll<HTMLElement>('a, button, input, select, textarea, .interactive');

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

  document.querySelectorAll<HTMLFormElement>('form[data-validate]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      const requiredInputs = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[required]');
      let isValid = true;

      requiredInputs.forEach((input) => {
        if (!input.value.trim()) {
          isValid = false;
          input.classList.add('is-invalid');
        } else {
          input.classList.remove('is-invalid');
        }
      });

      if (!isValid) {
        event.preventDefault();
        const message = form.querySelector<HTMLElement>('[data-form-message]');
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
