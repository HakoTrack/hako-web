/**
 * src/utils/images.ts
 * Handles image URL construction for ImageKit (Media) and Supabase (Profiles).
 */

const IMAGEKIT_ID = "HakoImage";

interface ImageOptions {
  w?: number;
  h?: number;
  f?: string;
  q?: number;
}

export const HakoImage = {
  /**
   * Constructs optimized URLs for ImageKit (Media) or returns Supabase URLs directly.
   */
  get: function (path: string | null | undefined, options: ImageOptions = {}): string {
    if (!path) return "";

    // 1. If it's already a full URL (Supabase storage), return it as-is
    if (path.startsWith('http')) {
      return path;
    }

    // 2. Treat relative path as a media asset for ImageKit origin
    const cleanPath = path.replace(/^\/+/, '');
    let baseUrl = `https://ik.imagekit.io/${IMAGEKIT_ID}/${cleanPath}`;

    const tr: string[] = [];
    if (options.w) tr.push(`w-${options.w}`);
    if (options.h) tr.push(`h-${options.h}`);
    if (options.f) tr.push(`f-${options.f}`); // webp, auto
    if (options.q) tr.push(`q-${options.q}`); // 1-100

    return tr.length > 0 ? `${baseUrl}?tr=${tr.join(',')}` : baseUrl;
  },

  /**
   * Helper for covers using dynamic ImageKit transforms.
   */
  getCover: function (id: number | string, size: 'small' | 'medium' | 'large' = 'medium'): string {
    const widths = {
      small: 120,
      medium: 240,
      large: 480
    };
    const width = widths[size] || widths.medium;
    return this.get(`covers/${id}.jpg`, { w: width, f: 'webp' });
  },

  /**
   * Helper for high-res banners using dynamic ImageKit transforms.
   */
  getBanner: function (id: number | string, width: number = 1920): string {
    return this.get(`banners/${id}.jpg`, { w: width, f: 'webp', q: 80 });
  },

  /**
   * Prefetch banner for performance optimization.
   */
  prefetchBanner: function (id: number | string): void {
    const url = this.getBanner(id);
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  }
};
