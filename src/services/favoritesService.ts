import { supabase } from '../utils/supabase.js';
import { ui } from '../core/ui.svelte';

export const FavoritesService = {
  /**
   * Fetches and syncs favorites to UI store for the given user.
   */
  async syncFavorites(userId: string, type?: string): Promise<number[]> {
    let query = supabase
      .from('profile_favorites')
      .select('media_id, media_type')
      .eq('profile_id', userId);

    if (type) {
      query = query.eq('media_type', type);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.error("Error syncing favorites:", error);
      return [];
    }

    const ids = data.map((f: any) => f.media_id);
    ui.setFavorites(ids);
    return ids;
  },

  /**
   * Toggles favorite status in DB and updates UI store.
   */
  async toggle(userId: string, mediaId: number, isCurrentlyFavorited: boolean): Promise<void> {
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
          .insert({ profile_id: userId, media_id: mediaId });

        if (error) throw error;
        ui.addFavorite(mediaId);
      }
    } catch (err) {
      console.error("Favorite toggle error:", err);
      throw err;
    }
  }
};
