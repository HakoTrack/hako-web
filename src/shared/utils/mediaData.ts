import { supabase } from '../../core/supabase';
import { CacheService } from '../../core/cache';
import { GENRES } from './constants';
import type { Media, ListEntry } from '../types/index';

const MEDIA_CACHE_VERSION = 1;

// --- Utilities ---

export function formatDescription(description: string | null | undefined): string {
  if (!description) return "";

  if (description.includes('<br')) {
    return description.replace(/\n/g, '');
  }

  return description.replace(/\n\n/g, '<br /><br />').replace(/\n/g, '<br />');
}

export function mapSupabaseMedia(media: any): Media | null {
  if (!media) return null;

  return {
    media_id: media.id,
    media_type: media.media_type || "anime",
    title: {
      romaji: media.title_romaji,
      english: media.title_english,
      native: media.title_native
    },
    description: media.description || "",
    format: media.format || "TV",
    source: media.source || null,
    status: media.status || "FINISHED",
    episodes: media.episodes || null,
    chapters: media.chapters || null,
    volumes: media.volumes || null,
    duration: media.duration || null,
    season: media.season || null,
    seasonYear: media.season_year || null,
    genres: media.genre_ids?.map((id: number) => GENRES[id - 1]) || [],
    tags: media.tags?.map((t: any) => ({ name: t.tag, rank: t.rank })) || [],
    tags_v2: media.tags_v2 || [],
    externalLinks: media.external_links || [],
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

export async function fetchUserListEntry(
  profileId: string,
  mediaId: number,
  type: string
): Promise<ListEntry | null> {
  const cacheKey = `${profileId}:${mediaId}:${type}`;
  const cached = await CacheService.getListEntry(cacheKey);

  if (cached) {
    // Perform lightweight timestamp check
    const { data: dbData, error: dbError } = await supabase
      .from('profile_list')
      .select('updated_at')
      .eq('profile_id', profileId)
      .eq('media_id', mediaId)
      .eq('media_type', type)
      .single();

    if (!dbError && dbData && new Date(dbData.updated_at).getTime() <= new Date(cached.lastSync).getTime()) {
      return cached.data;
    }
  }

  // Fetch full data
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

  if (error || !data) return null;

  const entry = mapSupabaseListEntry(data);
  // Update cache
  await CacheService.setListEntry(cacheKey, entry, data.updated_at);

  return entry;
}

// --- Optimized Fetchers ---

/**
 * Optimized fetch for LISTS/COVERS.
 * Returns only ID and Titles to minimize payload.
 */
export async function fetchMediaSummaries(
  ids: number[],
): Promise<Record<string, Media>> {
  if (!ids || ids.length === 0) return {};

  const result: Record<string, any> = {};
  const uncachedIds: number[] = [];

  // Chunked cache lookup to avoid microtask queue congestion
  const CACHE_CHUNK_SIZE = 1000;
  for (let i = 0; i < ids.length; i += CACHE_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CACHE_CHUNK_SIZE);
    const cachedResults = await Promise.all(
      chunk.map((id) => CacheService.getMedia(id.toString())),
    );

    chunk.forEach((id, index) => {
      const cached = cachedResults[index];
      if (cached && cached.data) {
        result[id.toString()] = cached.data;
      } else {
        uncachedIds.push(id);
      }
    });
  }

  if (uncachedIds.length > 0) {
    const CHUNK_SIZE = 1000; // Increased chunk size
    for (let i = 0; i < uncachedIds.length; i += CHUNK_SIZE) {
      const chunk = uncachedIds.slice(i, i + CHUNK_SIZE);
      const { data } = await supabase
        .from("media")
        .select("id, title_romaji, title_english, title_native")
        .in("id", chunk);

      if (data) {
        // Prepare bulk cache updates
        const cachePromises: Promise<any>[] = [];
        for (const item of data) {
          const summary = {
            media_id: item.id,
            title: {
              romaji: item.title_romaji,
              english: item.title_english,
              native: item.title_native,
            },
          };
          result[item.id.toString()] = summary;
          cachePromises.push(CacheService.setMedia(item.id.toString(), { data: summary, lastSync: new Date().toISOString() }));
        }
        await Promise.all(cachePromises);
      }
    }
  }

  return result as Record<string, Media>;
}

/**
 * Optimized fetch for LISTS needing GENRES and AFFINITY calculation.
 * Returns Media object with calculation fields populated.
 */
export async function fetchMediaSummaryWithGenres(
  ids: number[],
): Promise<Record<string, Media>> {
  if (!ids || ids.length === 0) return {};

  const result: Record<string, any> = {};
  const uncachedIds: number[] = [];

  // Chunked cache lookup to avoid microtask queue congestion
  const CACHE_CHUNK_SIZE = 1000;
  for (let i = 0; i < ids.length; i += CACHE_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CACHE_CHUNK_SIZE);
    const cachedResults = await Promise.all(
      chunk.map((id) => CacheService.getMedia(id.toString())),
    );

    chunk.forEach((id, index) => {
      const cached = cachedResults[index]?.data;
      const isGenresSummary =
        cached && "genres" in cached && "episodes" in cached;

      if (isGenresSummary) {
        result[id.toString()] = cached;
      } else {
        uncachedIds.push(id);
      }
    });
  }

  if (uncachedIds.length > 0) {
    const CHUNK_SIZE = 1000; // Increased chunk size
    for (let i = 0; i < uncachedIds.length; i += CHUNK_SIZE) {
      const chunk = uncachedIds.slice(i, i + CHUNK_SIZE);
      const { data } = await supabase
        .from("media")
        .select(
          "id, title_romaji, title_english, title_native, genre_ids, tags (tag, rank), episodes, chapters, volumes, format, duration, start_year, start_month, start_day",
        )
        .in("id", chunk);

      if (data) {
        const cachePromises: Promise<any>[] = [];
        for (const item of data) {
          const summary = {
            media_id: item.id,
            title: {
              romaji: item.title_romaji,
              english: item.title_english,
              native: item.title_native,
            },
            genres: item.genre_ids?.map((id: number) => GENRES[id - 1]) || [],
            tags:
              item.tags?.map((t: any) => ({ name: t.tag, rank: t.rank })) || [],
            tags_v2: [],
            externalLinks: [],
            episodes: item.episodes,
            chapters: item.chapters,
            volumes: item.volumes,
            format: item.format,
            duration: item.duration,
            startDate: {
              year: item.start_year,
              month: item.start_month,
              day: item.start_day,
            },
            seasonYear: item.start_year,
          };
          result[item.id.toString()] = summary;
          cachePromises.push(CacheService.setMedia(item.id.toString(), { data: summary, lastSync: new Date().toISOString() }));
        }
        await Promise.all(cachePromises);
      }
    }
  }

  return result as Record<string, Media>;
}

/**
 * Optimized fetch for QUICK EDITOR.
 */
export async function fetchMediaSummaryWithDescription(id: number): Promise<Media | null> {
  const { data, error } = await supabase
    .from('media')
    .select(`
      id, title_romaji, title_english, title_native,
      description,
      episodes, chapters, volumes,
      genre_ids
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return {
    media_id: data.id,
    media_type: 'anime',
    title: {
      romaji: data.title_romaji,
      english: data.title_english,
      native: data.title_native
    },
    description: data.description,
    format: 'TV',
    source: null,
    status: 'FINISHED',
    episodes: data.episodes,
    chapters: data.chapters,
    volumes: data.volumes,
    duration: null,
    season: null,
    seasonYear: null,
    genres: data.genre_ids?.map((id: number) => GENRES[id - 1]) || [],
    tags: [],
    tags_v2: [],
    externalLinks: [],
    startDate: { year: null, month: null, day: null },
    endDate: { year: null, month: null, day: null }
  } as Media;
}

/**
 * Optimized fetch for DETAIL PAGES.
 */
export async function fetchMediaDetails(id: number): Promise<Media | null> {
  const cached = await CacheService.getMedia(id.toString());
  // Unwrap from SyncCache and validate (check schema version to bust stale entries)
  const media = cached?.data;
  if (media && media._cacheVersion === MEDIA_CACHE_VERSION) return media;

  const { data } = await supabase
    .from('media')
    .select(`
      id, title_romaji, title_english, title_native, description, format, source, status,
      episodes, chapters, volumes, duration, season, season_year,
      genre_ids,
      tags (tag, rank),
      tags_v2,
      external_links,
      start_year, start_month, start_day,
      end_year, end_month, end_day
    `)
    .eq('id', id)
    .single();

  if (!data) return null;

  const fetchedMedia = mapSupabaseMedia(data);
  if (fetchedMedia) {
    (fetchedMedia as any)._cacheVersion = MEDIA_CACHE_VERSION;
    await CacheService.setMedia(id.toString(), { data: fetchedMedia, lastSync: new Date().toISOString() });
  }
  return fetchedMedia;
}

export async function fetchTagDefinitions(tagIds: number[]): Promise<
  Record<number, { name: string; category: string; parentName: string | null }>
> {
  if (!tagIds.length) return {};
  const { data } = await supabase
    .from('tags_v2')
    .select('id, name, category, genre_id')
    .in('id', tagIds);
  if (!data) return {};
  const result: Record<number, any> = {};
  for (const row of data) {
    result[row.id] = {
      name: row.name,
      category: row.category,
      parentName: row.genre_id ? GENRES[row.genre_id - 1] || null : null,
    };
  }
  return result;
}
