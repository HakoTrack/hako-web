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
 * Helper to parse ISO date strings into legacy { year, month, day } format.
 */
function parseDate(dateString) {
  if (!dateString) return { year: null, month: null, day: null };
  const d = new Date(dateString);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate()
  };
}

/**
 * Maps Supabase profile_anime_list data to the legacy JSON-like format.
 */
export function mapSupabaseAnimeListEntry(entry) {
  if (!entry) return null;

  return {
    id: entry.anime_id,
    score: entry.score,
    progress: entry.progress,
    status: entry.status,
    updatedAt: entry.updated_at,
    advancedScores: entry.advanced_score || {},
    startedAt: parseDate(entry.started_at),
    completedAt: parseDate(entry.completed_at),
    profileId: entry.profile_id
  };
}

/**
 * Fetches the entire anime list for a specific profile.
 */
export async function fetchUserAnimeList(profileId) {
  const { data, error } = await supabase
    .from('profile_anime_list')
    .select('*')
    .eq('profile_id', profileId);

  if (error) {
    console.error(`Error fetching anime list for profile ${profileId}:`, error);
    return [];
  }

  return data.map(mapSupabaseAnimeListEntry);
}

/**
 * Fetches a single anime list entry for a specific user and anime.
 */
export async function fetchUserAnimeListEntry(profileId, animeId) {
  const { data, error } = await supabase
    .from('profile_anime_list')
    .select('*')
    .eq('profile_id', profileId)
    .eq('anime_id', animeId)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching list entry for user ${profileId} and anime ${animeId}:`, error);
    return null;
  }

  return data ? mapSupabaseAnimeListEntry(data) : null;
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
