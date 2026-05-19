import { fetchMediaByIds } from '../utils/mediaData';
import type { Media } from '../types/index';

const cache = new Map<string, Media>();

export const MetadataService = {
  async getMetadata(ids: number[], type: string = 'anime'): Promise<Record<string, Media>> {
    const validIds = ids.filter((id): id is number => id != null);
    const uncached = validIds.filter(id => !cache.has(id.toString()));

    if (uncached.length > 0) {
      const newMetadata = await fetchMediaByIds(uncached, type);
      Object.entries(newMetadata).forEach(([id, data]) => cache.set(id, data));
    }

    // Return requested batch from cache
    return validIds.reduce((acc: Record<string, Media>, id) => {
      const entry = cache.get(id.toString());
      if (entry) {
        acc[id.toString()] = entry;
      }
      return acc;
    }, {});
  },

  invalidate(id?: number): void {
    if (id) cache.delete(id.toString());
    else cache.clear();
  }
};
