/**
 * Global UI State Module
 * Uses Svelte 5 Runes to manage global UI elements like modals.
 */

import { HakoImage } from '../utils/images.js';
import { fetchMediaById, fetchUserListEntry } from '../utils/mediaData.js';
import { AuthService } from './auth.js';

let activeModal = $state(null);
let modalData = $state(null);
let favoriteIds = $state(new Set());
let animeListCache = $state(new Map());

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
  },

  getAnimeList(profileId) { return animeListCache.get(profileId); },
  setAnimeList(profileId, data) { animeListCache.set(profileId, data); },
  invalidateAnimeList(profileId) { animeListCache.delete(profileId); }
};

function formatDateInput(dateObj) {
  if (!dateObj || !dateObj.year) return "";
  const year = dateObj.year;
  const month = String(dateObj.month).padStart(2, '0');
  const day = String(dateObj.day).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const openQuickEditor = async (id, type = 'anime') => {
  try {
    const mediaMetadata = await fetchMediaById(id);
    if (!mediaMetadata) throw new Error("Media metadata not found.");

    const user = await AuthService.getCurrentUser();
    let userEntry = {};

    if (user) {
      userEntry = await fetchUserListEntry(user.id, id, type) || {};
    }

    const titleObj = mediaMetadata?.title || {};
    const displayTitle = titleObj.english || titleObj.romaji || titleObj.native || userEntry.title || "Unknown Title";
    const rawDescription = mediaMetadata?.description || "No description available.";

    const hybridEntry = {
      id: id,
      type: type, // Ensure type is included
      title: displayTitle,
      description: rawDescription.replace(/\n/g, '<br>'),
      genres: mediaMetadata?.genres || [],
      banner: HakoImage.getBanner(type, id),
      image: HakoImage.getCover(type, id, 'medium'),
      status: userEntry.status || 'planning',
      score: userEntry.score || 0,
      progress: userEntry.progress || 0,
      total: mediaMetadata?.episodes || mediaMetadata?.chapters || userEntry.total || '?',
      startDate: formatDateInput(userEntry.startedAt),
      finishDate: formatDateInput(userEntry.completedAt),
      isFavorited: userEntry.isFavorited || false,
      rawMetadata: mediaMetadata
    };

    ui.openModal('quick-editor', { entry: hybridEntry });
  } catch (err) {
    console.error("QuickEditor Error:", err);
  }
};
