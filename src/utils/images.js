/**
 * scripts/utils/images.js
 * Handles image URL construction for Statically.
 * No API keys or accounts required.
 */

const GITHUB_USER = "HakoTrack";
const GITHUB_REPO = "hako-assets";
const GITHUB_BRANCH = "main";

export const HakoImage = {
  /**
   * Statically: Fetches and optimizes images (WebP, resizing).
   */
  get: function (path, options = {}) {
    if (!path) return "";

    // If the path is already a full URL, don't prepend the base
    let baseUrl = path;
    if (!path.startsWith('http')) {
      baseUrl = `https://cdn.statically.io/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${path}`;
    }

    const params = [];

    if (options.w) params.push(`w=${options.w}`);
    if (options.h) params.push(`h=${options.h}`);
    if (options.f) params.push(`f=${options.f}`); // webp, auto
    if (options.q) params.push(`q=${options.q}`); // 1-100

    return params.length > 0 ? `${baseUrl}?${params.join('&')}` : baseUrl;
  },

  /**
   * Helper for Anime/Manga covers using Statically WebP.
   */
  getCover: function (type, id, size = 'medium') {
    const width = size === 'small' ? 120 : 240;
    return this.get(`covers/${type}/${id}.jpg`, { w: width, f: 'webp' });
  },

  /**
   * Helper for high-res banners.
   */
  getBanner: function (type, id) {
    return this.get(`banners/${type}/${id}.jpg`, { w: 1200, f: 'webp', q: 80 });
  }
};

// Also attach to window for component compatibility
window.HakoImage = HakoImage;
