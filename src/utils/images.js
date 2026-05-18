/**
 * src/utils/images.js
 * Handles image URL construction for ImageKit (Media) and Supabase (Profiles).
 */

const IMAGEKIT_ID = "HakoImage";

export const HakoImage = {
  /**
   * Constructs optimized URLs for ImageKit (Media) or returns Supabase URLs directly.
   */
  get: function (path, options = {}) {
    if (!path) return "";

    // 1. If it's already a full URL (Supabase storage), return it as-is
    if (path.startsWith('http')) {
      return path;
    }

    // 2. Treat relative path as a media asset for ImageKit origin
    // Clean leading slashes
    const cleanPath = path.replace(/^\/+/, '');
    let baseUrl = `https://ik.imagekit.io/${IMAGEKIT_ID}/${cleanPath}`;

    const tr = [];
    if (options.w) tr.push(`w-${options.w}`);
    if (options.h) tr.push(`h-${options.h}`);
    if (options.f) tr.push(`f-${options.f}`); // webp, auto
    if (options.q) tr.push(`q-${options.q}`); // 1-100

    return tr.length > 0 ? `${baseUrl}?tr=${tr.join(',')}` : baseUrl;
  },

  /**
   * Helper for Anime/Manga covers using dynamic ImageKit transforms.
   */
  getCover: function (type, id, size = 'medium') {
    const widths = {
      small: 120,
      medium: 240,
      large: 480
    };
    const width = widths[size] || widths.medium;
    // Removed hardcoded suffix and rely on dynamic ImageKit transformation
    return this.get(`${type}/covers/${id}.jpg`, { w: width, f: 'webp' });
  },

  /**
   * Helper for high-res banners using dynamic ImageKit transforms.
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
