/**
 * Quick Editor Utility
 * Handles the UI and logic for rapid media entry updates.
 */

import { fetchAnimeById } from './animeData.js';

const QuickEditor = {
  isOpen: false,
  isFavorited: false,

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

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
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
    const username = this.getUsername();
    const userListPath = `/data/users/${username}/anime-list.json`;

    try {
      const [userRes, mediaMetadata] = await Promise.all([
        fetch(userListPath),
        fetchAnimeById(id)
      ]);

      if (!userRes.ok) throw new Error("User list data failed to load.");

      const userJson = await userRes.json();
      const userListData = userJson.data || userJson;
      const userEntry = Array.isArray(userListData) ? userListData.find(item => item.id === id) : {};

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

      const tonalProfile = window.ToneCalc ? window.ToneCalc.getTonalProfile(mediaMetadata) : null;

      this.render(hybridEntry, tonalProfile);

    } catch (err) {
      console.error("QuickEditor Error:", err);
    }
  },

  render: function (entry = {}, tonalProfile = null) {
    if (this.isOpen) return;

    this.isFavorited = entry.isFavorited || false;
    const defaultBanner = "";

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'quick-editor-overlay';
    modalOverlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-[#0b1622]/80 backdrop-blur-sm p-4';

    const genreHtml = entry.genres.map(g => `
              <span class="bg-blue-500/10 text-blue-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  ${g}
              </span>
          `).join('');

    const tonalHtml = tonalProfile && tonalProfile.sorted ?
      tonalProfile.sorted.slice(0, 3).map((p, i) => `
        <span class="${i === 0 ? 'bg-accent text-white' : 'bg-slate-800 text-slate-400'} text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
            ${p.name}
        </span>
      `).join('') : '';

    const modalContent = `
              <div class="bg-[#151f2e] w-full max-w-[700px] h-[800px] max-h-[90vh] rounded-md shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
                  <!-- Banner Section -->
                  <div class="relative w-full h-[160px] bg-[#0b1622] flex-shrink-0">
                      <img src="${entry.banner}" class="w-full h-full object-cover opacity-60" onerror="this.src='${defaultBanner}'">
                      <div class="absolute inset-0 bg-gradient-to-t from-[#151f2e] to-transparent"></div>
                      <button id="qe-close-btn" class="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-20">
                          <i class="fa-solid fa-xmark text-lg"></i>
                      </button>
                      <div class="absolute -bottom-10 left-8 flex items-end space-x-6 z-10 w-[calc(100%-4rem)]">
                          <img src="${entry.image}" class="w-[100px] h-[140px] rounded shadow-xl border border-[#151f2e] object-cover bg-[#0b1622]" onerror="this.src='/assets/covers/placeholder_medium.jpg'">
                          <div class="flex-1 min-w-0">
                              <h2 class="text-white font-bold text-xl leading-tight truncate drop-shadow-md">${entry.title}</h2>
                              <div class="flex flex-wrap gap-1.5 mt-2">
                                  ${genreHtml}
                              </div>
                              <div class="flex flex-wrap gap-1.5 mt-1.5">
                                  ${tonalHtml}
                              </div>
                          </div>
                      </div>
                  </div>

                  <!-- Editor Content -->
                  <div class="flex-1 flex flex-col min-h-0 px-8 pt-16 pb-6 overflow-hidden">
                      <!-- Controls Grid -->
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6 flex-shrink-0">
                          <div class="space-y-1.5">
                              <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</label>
                              <select id="qe-status" class="w-full bg-[#0b1622] text-slate-200 text-sm rounded border-none p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none cursor-pointer">
                                  <option value="watching" ${entry.status === 'watching' ? 'selected' : ''}>Watching</option>
                                  <option value="completed" ${entry.status === 'completed' ? 'selected' : ''}>Completed</option>
                                  <option value="paused" ${entry.status === 'paused' ? 'selected' : ''}>Paused</option>
                                  <option value="dropped" ${entry.status === 'dropped' ? 'selected' : ''}>Dropped</option>
                                  <option value="planning" ${entry.status === 'planning' ? 'selected' : ''}>Planning</option>
                              </select>
                          </div>
                          <div class="space-y-1.5">
                              <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Score</label>
                              <input type="number" id="qe-score" step="0.1" max="10" min="0" value="${entry.score}" class="w-full bg-[#0b1622] text-slate-200 text-sm rounded border-none p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none">
                          </div>
                          <div class="space-y-1.5">
                              <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Progress</label>
                              <div class="flex items-center space-x-2">
                                  <input type="number" id="qe-progress" value="${entry.progress}" class="w-full bg-[#0b1622] text-slate-200 text-sm rounded border-none p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none">
                                  <span class="text-slate-500 text-sm font-medium whitespace-nowrap">/ ${entry.total}</span>
                              </div>
                          </div>
                          <div class="space-y-1.5">
                              <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Start Date</label>
                              <input type="date" id="qe-start-date" value="${entry.startDate}" class="w-full bg-[#0b1622] text-slate-200 text-sm rounded border-none p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none [color-scheme:dark]">
                          </div>
                          <div class="space-y-1.5">
                              <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Finish Date</label>
                              <input type="date" id="qe-finish-date" value="${entry.finishDate}" class="w-full bg-[#0b1622] text-slate-200 text-sm rounded border-none p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none [color-scheme:dark]">
                          </div>
                      </div>

                      <!-- Scrollable Description Area -->
                      <div class="mt-8 flex-1 flex flex-col min-h-0">
                           <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 flex-shrink-0">Description</label>
                           <div class="text-slate-400 text-sm leading-relaxed overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800 flex-1">
                              ${entry.description}
                           </div>
                      </div>

                      <!-- Footer -->
                      <div class="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
                          <button id="qe-delete-btn" class="text-red-500/60 hover:text-red-500 text-sm font-bold transition-colors">Delete</button>
                          <div class="flex items-center space-x-6">
                              <button id="qe-fav-btn" class="${this.isFavorited ? 'text-red-500' : 'text-slate-400'} hover:scale-110 transition-all">
                                  <i class="fa-solid fa-heart text-xl"></i>
                              </button>
                              <button id="qe-save-btn" class="bg-blue-500 hover:bg-blue-400 text-white px-8 py-2 rounded text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95">Save</button>
                          </div>
                      </div>
                  </div>
              </div>
          `;

    modalOverlay.innerHTML = modalContent;
    document.body.appendChild(modalOverlay);
    this.isOpen = true;
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) this.close(); });

    document.getElementById('qe-close-btn')?.addEventListener('click', () => this.close());
    document.getElementById('qe-fav-btn')?.addEventListener('click', () => this.toggleFavorite());
    document.getElementById('qe-save-btn')?.addEventListener('click', () => this.save());
    document.getElementById('qe-delete-btn')?.addEventListener('click', () => this.delete());
  },

  toggleFavorite: function () {
    this.isFavorited = !this.isFavorited;
    const btn = document.getElementById('qe-fav-btn');
    if (btn) btn.className = `${this.isFavorited ? 'text-red-500' : 'text-slate-400'} hover:scale-110 transition-all`;
  },

  close: function () {
    const overlay = document.getElementById('quick-editor-overlay');
    if (overlay) {
      overlay.remove();
      this.isOpen = false;
    }
  },

  save: function () {
    this.close();
  },

  delete: function () {
    if (confirm("Delete this entry?")) this.close();
  }
};

export const initQuickEditor = () => {
  QuickEditor.init();
};

export const openQuickEditor = QuickEditor.openEditor.bind(QuickEditor);

// Global attachment for mockup compatibility
window.openQuickEditor = openQuickEditor;
