/**
 * src/utils/images.ts
 * Handles image URL construction for Media and Profiles.
 */

const ASSET_DOMAIN = "https://assets.hako.moe";

export const HakoImage = {
  /**
   * Constructs URLs for assets on media bucket or returns Supabase URLs directly.
   */
  get: function (path: string | null | undefined): string {
    if (!path) return "";

    // 1. If it's already a full URL (Supabase storage), return it as-is
    if (path.startsWith('http')) {
      return path;
    }

    // 2. Treat relative path as a media asset for media bucket origin
    const cleanPath = path.replace(/^\/+/, '');
    return `${ASSET_DOMAIN}/${cleanPath}`;
  },

  /**
   * Helper for covers mapping to pre-generated variants in media bucket: /covers/{id}/{size}.webp
   */
  getCover: function (id: number | string, size: 'small' | 'medium' | 'large' = 'medium'): string {
    return `${ASSET_DOMAIN}/covers/${id}/${size}.webp`;
  },

  /**
   * Helper for banners mapping to pre-generated banner in media bucket: /banners/{id}.webp
   */
  getBanner: function (id: number | string): string {
    return `${ASSET_DOMAIN}/banners/${id}.webp`;
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
