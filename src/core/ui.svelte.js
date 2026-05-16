/**
 * Global UI State Module
 * Uses Svelte 5 Runes to manage global UI elements like modals.
 */

let activeModal = $state(null);
let modalData = $state(null);
let favoriteIds = $state(new Set());

export const ui = {
  get activeModal() { return activeModal; },
  get modalData() { return modalData; },
  get favoriteIds() { return favoriteIds; },

  openModal(type, data = null) {
    activeModal = type;
    modalData = data;
  },

  closeModal() {
    activeModal = null;
    modalData = null;
  },

  setFavorites(ids) {
    favoriteIds = new Set(ids);
  },

  addFavorite(id) {
    favoriteIds.add(id);
    favoriteIds = new Set(favoriteIds); // Trigger reactivity
  },

  removeFavorite(id) {
    favoriteIds.delete(id);
    favoriteIds = new Set(favoriteIds); // Trigger reactivity
  }
};
