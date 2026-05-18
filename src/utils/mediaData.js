import { supabase } from './supabase.js';

/**
 * Maps Supabase relational media data to the legacy JSON-like format
 */
export function mapSupabaseMedia(media) {
  if (!media) return null;

  return {
    media_id: media.id,
    title: {
      romaji: media.title_romaji,
      english: media.title_english,
      native: media.title_native
    },
    description: media.description,
    format: media.format,
    status: media.status,
    episodes: media.episodes,
    chapters: media.chapters,
    volumes: media.volumes,
    duration: media.duration,
    season: media.season,
    seasonYear: media.season_year,
    genres: media.genres?.map(g => g.genre) || [],
    creators: media.creators?.map(c => ({ name: c.creator_name, role: c.role })) || [],
    tags: media.tags?.map(t => ({ name: t.name, rank: t.rank })) || [],
    startDate: parseDate(media.start_date),
    endDate: parseDate(media.end_date)
  };
}

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
 * Maps Supabase profile_list data to a normalized format.
 */
export function mapSupabaseListEntry(entry) {
  if (!entry) return null;

  return {
    media_id: entry.media_id,
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
 * Fetches a single user list entry.
 */
export async function fetchUserListEntry(profileId, mediaId, type) {
  const { data, error } = await supabase
    .from('profile_list')
    .select('*')
    .eq('profile_id', profileId)
    .eq('media_id', mediaId)
    .eq('media_type', type)
    .single();

  if (error) return null;
  return mapSupabaseListEntry(data);
}

/**
 * Fetches multiple media by IDs from Supabase using the unified 'media' table.
 */
export async function fetchMediaByIds(ids, type) {
  if (!ids || ids.length === 0) return {};

  const { data, error } = await supabase
    .from('media')
    .select(`
      *,
      genres!fk_media_genres(genre),
      tags(tag, rank)
    `)
    .eq('media_type', type)
    .in('id', ids);

  if (error) {
    console.error(`Error fetching media from unified table:`, error);
    return {};
  }

  return data.reduce((acc, item) => {
    acc[item.id.toString()] = mapSupabaseMedia(item);
    return acc;
  }, {});
}

/**
 * Fetches a single media by ID.
 */
export async function fetchMediaById(id) {
  const { data, error } = await supabase
    .from('media')
    .select(`
      *,
      genres!fk_media_genres(genre),
      tags(tag, rank)
    `)
    .eq('id', id)
    .single();

  if (error) return null;
  return mapSupabaseMedia(data);
}
