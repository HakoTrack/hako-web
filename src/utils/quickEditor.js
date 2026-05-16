/**
 * Quick Editor Utility
 * Handles the logic for rapid media entry updates and triggers the Svelte modal.
 */

import { fetchAnimeById, fetchUserAnimeListEntry } from './animeData.js';
import { ui } from '../core/ui.svelte.js';
import { AuthService } from '../core/auth.js';

const QuickEditor = {
  /**
   * Initializes the global click listener for media items.
   */
  init: function () {
    document.addEventListener('click', async (e) => {
      const target = e.target.closest('.media-cover');

      if (target) {
        if (target.dataset.mediaId) {
          e.preventDefault();
          const mediaId = parseInt(target.dataset.mediaId);
          await this.openEditor(mediaId);
        }
      }
    });

    console.log("%c QuickEditor Hooked to .media-cover ", "background: #3b82f6; color: #fff; font-weight: bold; padding: 4px; border-radius: 2px;");
  },

  getUsername: function () {
    const pathParts = window.location.pathname.split('/').filter(p => p);
    return pathParts[pathParts.length - 1] || 'shaetsu';
  },

  formatDateInput: function (dateObj) {
    if (!dateObj || !dateObj.year) return "";
    const year = dateObj.year;
    const month = String(dateObj.month).padStart(2, '0');
    const day = String(dateObj.day).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  openEditor: async function (id) {
    try {
      // 1. Fetch mandatory media metadata
      const mediaMetadata = await fetchAnimeById(id);
      if (!mediaMetadata) throw new Error("Media metadata not found.");

      // 2. Fetch logged-in user's personal progress from Supabase
      const user = await AuthService.getCurrentUser();
      let userEntry = {};

      if (user) {
        userEntry = await fetchUserAnimeListEntry(user.id, id) || {};
      }

      const titleObj = mediaMetadata?.title || {};
      const displayTitle = titleObj.english || titleObj.romaji || titleObj.native || userEntry.title || "Unknown Title";
      const rawDescription = mediaMetadata?.description || "No description available.";

      const hybridEntry = {
        id: id,
        title: displayTitle,
        description: rawDescription.replace(/\n/g, '<br>'),
        genres: mediaMetadata?.genres || [],
        banner: `/assets/banners/anime/${id}.jpg`,
        image: `/assets/covers/anime/${id}_medium.jpg`,
        status: userEntry.status || 'planning',
        score: userEntry.score || 0,
        progress: userEntry.progress || 0,
        total: mediaMetadata?.episodes || userEntry.total || '?',
        startDate: this.formatDateInput(userEntry.startedAt),
        finishDate: this.formatDateInput(userEntry.completedAt),
        isFavorited: userEntry.isFavorited || false,
        rawMetadata: mediaMetadata
      };

      // Trigger the Svelte Modal via the global UI state
      ui.openModal('quick-editor', { entry: hybridEntry });

    } catch (err) {
      console.error("QuickEditor Error:", err);
    }
  }
};

export const initQuickEditor = () => {
  QuickEditor.init();
};

export const openQuickEditor = QuickEditor.openEditor.bind(QuickEditor);

// Global attachment for mockup compatibility
window.openQuickEditor = openQuickEditor;
