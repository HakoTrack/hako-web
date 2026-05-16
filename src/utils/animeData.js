import { supabase } from './supabase.js';

/**
 * Maps Supabase relational anime data to the legacy JSON-like format
 * used by ToneCalc, QuickEditor, and RenderMediaList.
 */
export function mapSupabaseAnime(anime) {
  if (!anime) return null;

  return {
    id: anime.id,
    title: {
      romaji: anime.title_romaji,
      english: anime.title_english,
      native: anime.title_native
    },
    description: anime.description,
    format: anime.format,
    status: anime.status,
    episodes: anime.episodes,
    season: anime.season,
    seasonYear: anime.season_year,
    genres: anime.anime_genres?.map(g => g.genre) || [],
    studios: anime.anime_studios?.map(s => s.studio) || [],
    tags: anime.anime_tags?.map(t => ({ name: t.name, rank: t.rank })) || [],
    startDate: {
      year: anime.start_year,
      month: anime.start_month,
      day: anime.start_day
    },
    endDate: {
      year: anime.end_year,
      month: anime.end_month,
      day: anime.end_day
    }
  };
}

/**
 * Fetches a single anime by ID from Supabase.
 */
export async function fetchAnimeById(id) {
  const { data, error } = await supabase
    .from('anime')
    .select(`
      *,
      anime_genres (genre),
      anime_studios (studio),
      anime_tags (name, rank)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching anime ${id}:`, error);
    return null;
  }

  return mapSupabaseAnime(data);
}

/**
 * Fetches multiple anime by IDs from Supabase.
 */
export async function fetchAnimeByIds(ids) {
  if (!ids || ids.length === 0) return {};

  const { data, error } = await supabase
    .from('anime')
    .select(`
      *,
      anime_genres (genre),
      anime_studios (studio),
      anime_tags (name, rank)
    `)
    .in('id', ids);

  if (error) {
    console.error('Error fetching multiple anime:', error);
    return {};
  }

  // Return a map for easy lookup by ID
  return data.reduce((acc, anime) => {
    acc[anime.id.toString()] = mapSupabaseAnime(anime);
    return acc;
  }, {});
}
