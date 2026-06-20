import { supabase } from '../../../core/supabase';
import { type Result, success, failure } from '../../../shared/utils/result';
import type { Media } from '../../../shared/types/index';
import { mapSupabaseMedia } from '../../../shared/utils/mediaData';
import { GENRES } from '../../../shared/utils/constants';

export interface BrowseFilters {
  genre: string;
  tag: string;
  year?: number;
  search: string;
  format: string;
}

// authorative list of tags to avoid db scans
export const COMMON_TAGS = [
  "Anti-Hero", "Boys' Love", "CGDCT", "Coming of Age", "Cyberpunk",
  "Delinquents", "Demons", "Detective", "Dystopian", "Educational",
  "Female Protagonist", "Gore", "Harem", "Hentai", "Historical",
  "Isekai", "Iyashikei", "Josei", "Kids", "Magic", "Magical Girl",
  "Male Protagonist", "Martial Arts", "Military", "Music", "Mythology",
  "Nudity", "Parody", "Police", "Post-Apocalyptic", "Primarily Adult Cast",
  "Primarily Female Cast", "Primarily Male Cast", "Reincarnation", "Reverse Harem",
  "Samurai", "School", "Seinen", "Shoujo", "Shounen", "Space", "Super Power",
  "Time Manipulation", "Tragedy", "Vampire", "Video Games", "War", "Work"
];

export const FORMATS_BY_TYPE: Record<string, string[]> = {
  anime: ["TV", "TV_SHORT", "MOVIE", "SPECIAL", "OVA", "ONA", "MUSIC"],
  manga: ["MANGA", "ONE_SHOT"],
  light_novel: ["NOVEL"]
};

export const BrowseService = {
  async getFilteredMedia(mediaType: string, filters: BrowseFilters, page: number = 0, pageSize: number = 60): Promise<Result<Media[]>> {
    const hasTag = !!filters.tag;

    let query = supabase
      .from('media')
      .select(`
        id, title_romaji, title_english, title_native, format,
        episodes, chapters, volumes, duration, season, season_year,
        genre_ids,
        tags${hasTag ? '!inner' : ''} (tag, rank),
        start_year, start_month, start_day,
        end_year, end_month, end_day
      `)
      .eq('media_type', mediaType);

    if (filters.genre) {
      const genreId = GENRES.indexOf(filters.genre) + 1;
      if (genreId > 0) {
        query = query.filter('genre_ids', 'cs', `[${genreId}]`);
      }
    }

    if (filters.tag) {
      query = query.eq('tags.tag', filters.tag);
    }

    if (filters.year) {
      query = query.eq('start_year', filters.year);
    }

    if (filters.format) {
      query = query.eq('format', filters.format);
    }

    if (filters.search) {
      query = query.or(`title_romaji.ilike.%${filters.search}%,title_english.ilike.%${filters.search}%,title_native.ilike.%${filters.search}%`);
    }

    query = query.order('id', { ascending: false });
    query = query.range(page * pageSize, (page + 1) * pageSize - 1);

    const { data, error } = await query;

    if (error) return failure(error.message);

    const media = (data || []).map(mapSupabaseMedia).filter(Boolean) as Media[];
    return success(media);
  },

  async getGenres(): Promise<string[]> {
    return GENRES;
  },

  async getTags(): Promise<string[]> {
    return COMMON_TAGS;
  },

  async getFormats(mediaType: string): Promise<string[]> {
    return FORMATS_BY_TYPE[mediaType] || [];
  }
};
