import { supabase } from '../../core/supabase';
import { CacheService } from '../../core/cache';
import { GENRES } from './constants';
import type { Media, ListEntry } from '../types/index';

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
    tags: [],
    tags_v2: media.tags_v2 || [],
    vibe_vector: media.vibe_vector || {},
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

  const SUMMARY_TTL = 24 * 60 * 60 * 1000; // 24 hours
  const result: Record<string, any> = {};
  const uncachedIds: number[] = [];

  const CACHE_CHUNK_SIZE = 1000;
  for (let i = 0; i < ids.length; i += CACHE_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CACHE_CHUNK_SIZE);
    const cachedResults = await Promise.all(
      chunk.map((id) => CacheService.getMedia(id.toString())),
    );

    chunk.forEach((id, index) => {
      const cached = cachedResults[index];
      if (
        cached &&
        cached.data &&
        cached.lastSync &&
        Date.now() - new Date(cached.lastSync).getTime() < SUMMARY_TTL
      ) {
        result[id.toString()] = cached.data;
      } else {
        uncachedIds.push(id);
      }
    });
  }

  if (uncachedIds.length > 0) {
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < uncachedIds.length; i += CHUNK_SIZE) {
      const chunk = uncachedIds.slice(i, i + CHUNK_SIZE);
      const { data } = await supabase
        .from("media")
        .select("id, title_romaji, title_english, title_native, media_type, format, episodes, chapters, volumes")
        .in("id", chunk);

      if (data) {
        const now = new Date().toISOString();
        const batch: { key: string; value: any }[] = [];
        for (const item of data) {
          const summary = {
            media_id: item.id,
            title: {
              romaji: item.title_romaji,
              english: item.title_english,
              native: item.title_native,
            },
            media_type: item.media_type,
            format: item.format,
            episodes: item.episodes,
            chapters: item.chapters,
            volumes: item.volumes,
          };
          result[item.id.toString()] = summary;
          batch.push({ key: item.id.toString(), value: { data: summary, lastSync: now } });
        }
        await CacheService.setMediaBatch(batch);
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

  const SUMMARY_TTL = 24 * 60 * 60 * 1000; // 24 hours
  const result: Record<string, any> = {};
  const uncachedIds: number[] = [];

  const CACHE_CHUNK_SIZE = 1000;
  for (let i = 0; i < ids.length; i += CACHE_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CACHE_CHUNK_SIZE);
    const cachedResults = await Promise.all(
      chunk.map((id) => CacheService.getMedia(id.toString())),
    );

    chunk.forEach((id, index) => {
      const cached = cachedResults[index];
      const data = cached?.data;
      const hasRequiredFields = data && "genres" in data && "episodes" in data;

      if (
        hasRequiredFields &&
        cached.lastSync &&
        Date.now() - new Date(cached.lastSync).getTime() < SUMMARY_TTL
      ) {
        result[id.toString()] = data;
      } else {
        uncachedIds.push(id);
      }
    });
  }

  if (uncachedIds.length > 0) {
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < uncachedIds.length; i += CHUNK_SIZE) {
      const chunk = uncachedIds.slice(i, i + CHUNK_SIZE);
      const { data } = await supabase
        .from("media")
        .select(
          "id, title_romaji, title_english, title_native, genre_ids, episodes, chapters, volumes, format, duration, start_year, start_month, start_day",
        )
        .in("id", chunk);

      if (data) {
        const now = new Date().toISOString();
        const batch: { key: string; value: any }[] = [];
        for (const item of data) {
          const summary = {
            media_id: item.id,
            title: {
              romaji: item.title_romaji,
              english: item.title_english,
              native: item.title_native,
            },
            genres: item.genre_ids?.map((id: number) => GENRES[id - 1]) || [],
            tags: [],
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
          batch.push({ key: item.id.toString(), value: { data: summary, lastSync: now } });
        }
        await CacheService.setMediaBatch(batch);
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
 * Merge fresh detail-only fields into a cached media object and update the cache.
 */
async function enrichCachedMedia(
  id: number,
  cached: { data: any; lastSync: string },
): Promise<void> {
  const { data } = await supabase
    .from('media')
    .select(
      'description, source, status, season, season_year, genre_ids, duration, external_links, start_year, start_month, start_day, end_year, end_month, end_day, tags_v2, vibe_vector',
    )
    .eq('id', id)
    .single();
  if (!data) return;

  const c = cached.data;
  c.description = data.description ?? "";
  c.source = data.source;
  c.status = data.status;
  c.season = data.season;
  c.seasonYear = data.season_year;
  c.genres = (data.genre_ids ?? []).map((id: number) => GENRES[id - 1]) || [];
  c.duration = data.duration;
  c.externalLinks = data.external_links || [];
  c.startDate = { year: data.start_year, month: data.start_month, day: data.start_day };
  c.endDate = { year: data.end_year, month: data.end_month, day: data.end_day };
  c.tags_v2 = data.tags_v2;
  c.vibe_vector = data.vibe_vector || {};

  await CacheService.setMedia(id.toString(), { data: c, lastSync: new Date().toISOString() });
}

/**
 * Optimized fetch for DETAIL PAGES.
 */
export async function fetchMediaDetails(id: number): Promise<Media | null> {
  const cached = await CacheService.getMedia(id.toString());

  if (cached?.data && cached.lastSync) {
    // Lightweight freshness check: fetch only updated_at
    const { data: updateData, error } = await supabase
      .from('media')
      .select('updated_at')
      .eq('id', id)
      .single();

    if (!error && updateData) {
      const dbTime = new Date(updateData.updated_at).getTime();
      const cacheTime = new Date(cached.lastSync).getTime();
      if (dbTime <= cacheTime) {
        // Cache is fresh; enrich if any key detail fields are null
        // (catches both missing keys from summary-tier caches
        //  and explicit nulls from old detail-page caches)
        if (cached.data.source == null) {
          await enrichCachedMedia(id, cached);
        }
        return cached.data;
      }
    }
  }

  const { data } = await supabase
    .from('media')
    .select(`
      id, title_romaji, title_english, title_native, description, format, source, status,
      episodes, chapters, volumes, duration, season, season_year,
      genre_ids,
      tags_v2,
      vibe_vector,
      external_links,
      start_year, start_month, start_day,
      end_year, end_month, end_day
    `)
    .eq('id', id)
    .single();

  if (!data) return null;

  const fetchedMedia = mapSupabaseMedia(data);
  if (fetchedMedia) {
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
