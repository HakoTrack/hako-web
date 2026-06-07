import { fetchMediaDetails, fetchMediaSummaryWithGenres } from '../../../shared/utils/mediaData';
import type { Media } from '../../../shared/types/index';

// MetadataService is now a wrapper for the optimized fetchers.
// Components should ideally use fetchers directly to avoid this extra layer if possible.
export const MetadataService = {
  async getMetadata(ids: number[], type?: string): Promise<Record<string, Media>> {
    // This now just serves as a compatibility layer.
    // For lists needing genres, use fetchMediaSummaryWithGenres.
    // For detail pages, use fetchMediaDetails.
    const summaries = await fetchMediaSummaryWithGenres(ids);

    // Convert Pick<Media, ...> to Media for compatibility
    return Object.entries(summaries).reduce((acc, [id, data]) => {
      acc[id] = { ...data, description: "" } as unknown as Media;
      return acc;
    }, {} as Record<string, Media>);
  },
  invalidate(id?: number): void {
    // Cache invalidation is now handled in CacheService
  }
};
