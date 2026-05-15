export const Modal = {
  create: (content) => {
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    // Only handles dimming and centering
    overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-[#0b1622]/80 backdrop-blur-sm p-4';

    overlay.innerHTML = content;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) Modal.close();
    });
  },
  close: () => {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.remove();
  }
};
