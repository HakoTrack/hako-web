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

    // If it's already a full URL, return it as-is
    if (path.startsWith('http')) {
      return path;
    }

    // If it's a relative path, assume it's a GitHub asset and route through Statically
    let baseUrl = `https://cdn.statically.io/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${path}`;

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
    const sizes = {
      small: { w: 120, suffix: '_small' },
      medium: { w: 240, suffix: '_medium' },
      large: { w: 480, suffix: '_large' }
    };
    const config = sizes[size] || sizes.medium;
    return this.get(`${type}/covers/${id}${config.suffix}.jpg`, { w: config.w, f: 'webp' });
  },

  /**
   * Helper for high-res banners.
   */
  getBanner: function (type, id) {
    return this.get(`${type}/banners/${id}.jpg`, { w: 1200, f: 'webp', q: 80 });
  },

  /**
   * Prefetch banner for performance optimization.
   */
  prefetchBanner: function (type, id) {
    const url = this.getBanner(type, id);
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  }
};

// Also attach to window for component compatibility
window.HakoImage = HakoImage;
