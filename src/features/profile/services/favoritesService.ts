import { supabase } from '../../../core/supabase.js';
import { ui } from '../../../core/ui.svelte';
import { CacheService } from '../../../core/cache';

export const FavoritesService = {
  /**
   * Fetches and syncs favorites to UI store for the given user.
   */
  async syncFavorites(userId: string, type: string): Promise<number[]> {
    const cacheKey = `${userId}_${type}`;
    const cached = await CacheService.getFavorites(cacheKey);

    try {
      // 1. Optimized check (count check)
      const { count: serverCount, error: countError } = await supabase
        .from('profile_favorites')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', userId)
        .eq('media_type', type);

      if (countError) throw countError;

      if (cached && serverCount === cached.data.length) {
        ui.setFavorites(cached.data);
        return cached.data;
      }

      // 2. Fallback: Full Fetch
      let query = supabase
        .from('profile_favorites')
        .select('media_id, media_type')
        .eq('profile_id', userId)
        .eq('media_type', type);

      const { data, error } = await query;

      if (error || !data) {
        console.error("Error syncing favorites:", error);
        return cached ? cached.data : [];
      }

      const ids = data.map((f: any) => f.media_id);
      const lastSync = new Date().toISOString();
      await CacheService.setFavorites(cacheKey, ids, lastSync);
      ui.setFavorites(ids);
      return ids;

    } catch (e) {
      console.error('Favorites Sync Error:', e);
      if (cached) {
        ui.setFavorites(cached.data);
        return cached.data;
      }
      return [];
    }
  },

  /**
   * Toggles favorite status in DB and updates UI store.
   */
  async toggle(userId: string, mediaId: number, mediaType: string, isCurrentlyFavorited: boolean): Promise<void> {
    try {
      if (isCurrentlyFavorited) {
        const { error } = await supabase
          .from('profile_favorites')
          .delete()
          .eq('profile_id', userId)
          .eq('media_id', mediaId);

        if (error) throw error;
        ui.removeFavorite(mediaId);
      } else {
        const { error } = await supabase
          .from('profile_favorites')
          .insert({ profile_id: userId, media_id: mediaId, media_type: mediaType });

        if (error) throw error;
        ui.addFavorite(mediaId);
      }

      // Invalidate cache
      await CacheService.deleteFavorites(`${userId}_${mediaType}`);
    } catch (err) {
      console.error("Favorite toggle error:", err);
      throw err;
    }
  }
};
