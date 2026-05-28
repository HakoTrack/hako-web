import { supabase } from '../../core/supabase';
import type { Media, ListEntry } from '../types/index';

/**
 * Text processing utilities
 */

export function formatDescription(description: string | null | undefined): string {
  if (!description) return "";
  return description.replace(/\n/g, '<br />');
}

/**
 * Maps Supabase relational media data to the legacy JSON-like format
 */
export function mapSupabaseMedia(media: any): Media | null {
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
    source: media.source,
    status: media.status,
    episodes: media.episodes,
    chapters: media.chapters,
    volumes: media.volumes,
    duration: media.duration,
    season: media.season,
    seasonYear: media.season_year,
    genres: media.genres?.map((g: any) => g.genre) || [],
    tags: media.tags?.map((t: any) => ({ name: t.tag, rank: t.rank })) || [],
    startDate: { year: media.start_year, month: media.start_month, day: media.start_day },
    endDate: { year: media.end_year, month: media.end_month, day: media.end_day }
  };
}

function parseDate(dateString: string | null) {
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
export function mapSupabaseListEntry(entry: any): ListEntry | null {
  if (!entry) return null;

  return {
    media_id: entry.media_id,
    score: entry.score,
    progress: entry.progress,
    progress_volumes: entry.progress_volumes,
    status: entry.status,
    updatedAt: entry.updated_at,
    advancedScores: entry.advanced_scores || {},
    startedAt: parseDate(entry.started_at),
    completedAt: parseDate(entry.completed_at),
    profileId: entry.profile_id
  };
}

/**
 * Fetches a single user list entry.
 */
export async function fetchUserListEntry(profileId: string, mediaId: number, type: string): Promise<ListEntry | null> {
  const { data, error } = await supabase
    .from('profile_list')
    .select(`
        media_id, score, progress, progress_volumes, status, updated_at, advanced_scores, profile_id,
        started_at, completed_at
    `)
    .eq('profile_id', profileId)
    .eq('media_id', mediaId)
    .eq('media_type', type)
    .single();

  if (error) {
    return null;
  }
  return mapSupabaseListEntry(data);
}

/**
 * Fetches multiple media by IDs from Supabase.
 * If type is provided, filters by it. Otherwise, fetches all.
 */
export async function fetchMediaByIds(ids: number[], type?: string): Promise<Record<string, Media>> {
  if (!ids || ids.length === 0) return {};

  const CHUNK_SIZE = 200;
  const chunks = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + CHUNK_SIZE));
  }

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      let query = supabase.from('media').select(`
          *,
          genres (genre),
          tags (tag, rank)
        `).in('id', chunk);

      if (type) {
        query = query.eq('media_type', type);
      }

      const { data, error } = await query;
      if (error) {
        return [];
      }
      return data || [];
    })
  );

  return results.flat().reduce((acc: Record<string, Media>, item: any) => {
    const mapped = mapSupabaseMedia(item);
    if (mapped) acc[item.id.toString()] = mapped;
    return acc;
  }, {});
}

/**
 * Fetches a single media by ID.
 */
export async function fetchMediaById(id: number): Promise<Media | null> {
  const { data, error } = await supabase
    .from('media')
    .select(`
      *,
      genres (genre),
      tags (tag, rank)
    `)
    .eq('id', id)
    .single();

  if (error) {
    return null;
  }
  return mapSupabaseMedia(data);
}
