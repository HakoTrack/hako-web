/**
 * Global UI State Module
 * Uses Svelte 5 Runes to manage global UI elements like modals.
 */

let activeModal = $state(null);
let modalData = $state(null);

export const ui = {
  get activeModal() { return activeModal; },
  get modalData() { return modalData; },

  openModal(type, data = null) {
    activeModal = type;
    modalData = data;
  },

  closeModal() {
    activeModal = null;
    modalData = null;
  }
};
