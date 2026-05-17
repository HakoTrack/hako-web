import { fetchMediaByIds } from '../utils/mediaData.js';

const cache = new Map();

export const MetadataService = {
  async getMetadata(ids, type = 'anime') {
    const validIds = ids.filter(id => id != null);
    const uncached = validIds.filter(id => !cache.has(id.toString()));

    if (uncached.length > 0) {
      const newMetadata = await fetchMediaByIds(uncached, type);
      Object.entries(newMetadata).forEach(([id, data]) => cache.set(id, data));
    }

    // Return requested batch from cache
    return validIds.reduce((acc, id) => {
      acc[id.toString()] = cache.get(id.toString());
      return acc;
    }, {});
  },
  invalidate(id) {
    if (id) cache.delete(id.toString());
    else cache.clear();
  }
};
