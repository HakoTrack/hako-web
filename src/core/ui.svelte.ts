import { AuthService } from '../core/auth';
import { supabase } from '../core/supabase.js';
import { ListService } from '../features/profile/services/listService';
import { MetadataService } from '../features/media/services/metadataService';
import { fetchUserListEntry, fetchMediaSummaryWithDescription } from '../shared/utils/mediaData';
import type { Media, QuickUpdateItem } from '../shared/types/index';
import { CacheService } from './cache';

export interface ModalData {
  entry?: any;
  profile?: any;
  profileId?: string;
  isFetching?: boolean;
  onSaved?: (collectionId?: string) => void;
}

export type ModalType = 'quick-editor' | 'login' | 'signup' | 'settings' | 'theme' | 'collection-form' | null;

interface UIState {
  activeModal: ModalType;
  modalData: ModalData | null;
  favoriteIds: Set<number>;
  animeListCache: Map<string, any[]>;
  // Search Overlay State
  isSearchOpen: boolean;
  searchQuery: string;
  searchResults: any[];
  isSearching: boolean;
  // Quick Update State
  isQuickUpdateOpen: boolean;
  quickUpdateItems: QuickUpdateItem[];
  isQuickUpdateLoading: boolean;
  loadQuickUpdateItems: () => Promise<void>;
  prefetchSchedule: () => Promise<void>;
  setFavorites: (ids: number[]) => void;
  addFavorite: (id: number) => void;
  removeFavorite: (id: number) => void;
}

export const ui: UIState = $state({
  activeModal: null as ModalType,
  modalData: null as ModalData | null,
  favoriteIds: new Set<number>(),
  animeListCache: new Map<string, any[]>(),
  isSearchOpen: false,
  searchQuery: "",
  searchResults: [] as any[],
  isSearching: false,
  // Quick Update State
  isQuickUpdateOpen: false as boolean,
  quickUpdateItems: [] as QuickUpdateItem[],
  isQuickUpdateLoading: false as boolean,
  async loadQuickUpdateItems() {
    if (this.quickUpdateItems.length > 0 && !this.isQuickUpdateOpen) return;

    this.isQuickUpdateLoading = true;
    const user = await AuthService.getCurrentUser();
    if (!user) {
      this.isQuickUpdateLoading = false;
      return;
    }

    try {
      const [animeRes, mangaRes, lnRes] = await Promise.all([
        ListService.getList(user.id, 'anime'),
        ListService.getList(user.id, 'manga'),
        ListService.getList(user.id, 'light_novel')
      ]);

      const currentAnime = (animeRes.success ? animeRes.data : [])
        .filter(i => i.status === 'current')
        .map(i => ({ ...i, media_type: 'anime' }));
      const currentManga = (mangaRes.success ? mangaRes.data : [])
        .filter(i => i.status === 'current')
        .map(i => ({ ...i, media_type: 'manga' }));
      const currentLN = (lnRes.success ? lnRes.data : [])
        .filter(i => i.status === 'current')
        .map(i => ({ ...i, media_type: 'light_novel' }));

      const allCurrent = [...currentAnime, ...currentManga, ...currentLN]
        .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
      const ids = allCurrent.map(i => i.media_id);

      if (ids.length === 0) {
        this.quickUpdateItems = [];
        return;
      }

      const metadata = await MetadataService.getMetadata(ids);

      this.quickUpdateItems = allCurrent.map(item => ({
        ...item,
        metadata: metadata[item.media_id]
      })).filter(item => item.metadata);
    } finally {
      this.isQuickUpdateLoading = false;
    }
  },
  async prefetchSchedule() {
    const user = await AuthService.getCurrentUser();
    if (!user) return;

    // Skip if already cached from a previous preload
    const cached = await CacheService.getSchedule(user.id);
    if (cached?.data) return;

    const nowTs = Math.floor(Date.now() / 1000);

    const { data: profileList } = await supabase
      .from("profile_list")
      .select("media_id, progress, status")
      .eq("profile_id", user.id)
      .eq("media_type", "anime")
      .in("status", ["current", "planning"]);

    if (!profileList?.length) return;

    const listMap = new Map(profileList.map((e: any) => [e.media_id, { progress: e.progress, status: e.status }]));
    const mediaIds = profileList.map((e: any) => e.media_id);

    const { data: schedules } = await supabase
      .from("airing_schedules")
      .select("id, episode, airing_at, media_id")
      .in("media_id", mediaIds)
      .gte("airing_at", nowTs - 14 * 86400)
      .order("airing_at", { ascending: true });

    if (!schedules?.length) return;

    const mediaSchedMap = new Map<number, any[]>();
    for (const s of schedules) {
      if (!mediaSchedMap.has(s.media_id)) mediaSchedMap.set(s.media_id, []);
      mediaSchedMap.get(s.media_id)!.push(s);
    }

    const entries: any[] = [];
    for (const [mediaId, scheds] of mediaSchedMap) {
      const nextEntry = scheds.find((s: any) => s.airing_at > nowTs);
      if (!nextEntry) continue;
      const entry = listMap.get(mediaId) || { progress: 0, status: "current" };
      entries.push({
        media_id: mediaId,
        next_episode: nextEntry.episode,
        airing_at: nextEntry.airing_at,
        progress: entry.progress,
        status: entry.status,
        behind: Math.max(0, nextEntry.episode - 1 - entry.progress),
        episodes: null,
      });
    }

    const gracePeriod = 72 * 3600;
    const excludedIds = new Set(entries.map((e: any) => e.media_id));
    for (const [mediaId, scheds] of mediaSchedMap) {
      if (excludedIds.has(mediaId)) continue;
      const lastAired = Math.max(...scheds.map((s: any) => s.airing_at));
      if (lastAired > nowTs - gracePeriod) excludedIds.add(mediaId);
    }

    // Fetch episode counts for schedule entries
    if (entries.length > 0) {
      const { data: mediaRows } = await supabase
        .from("media")
        .select("id, episodes")
        .in("id", entries.map((e: any) => e.media_id));
      if (mediaRows) {
        const epMap = new Map(mediaRows.map((m: any) => [m.id, m.episodes]));
        for (const e of entries) e.episodes = epMap.get(e.media_id) ?? null;
      }
    }

    await CacheService.setSchedule(
      user.id,
      { entries, excludedIds: [...excludedIds] },
      new Date().toISOString(),
    );
  },
  setFavorites(ids: number[]) {
    this.favoriteIds = new Set(ids);
  },
  addFavorite(id: number) {
    this.favoriteIds.add(id);
  },
  removeFavorite(id: number) {
    this.favoriteIds.delete(id);
  }
});


export function openModal(type: ModalType, data: ModalData | null = null) {
  ui.activeModal = type;
  ui.modalData = data;
}

export function closeModal() {
  ui.activeModal = null;
  ui.modalData = null;
}

export async function openQuickEditor(mediaId: number, type: string = 'anime') {
  openModal('quick-editor', { isFetching: true });

  const cached = await CacheService.getMedia(mediaId.toString());

  const isFresh = cached && (Date.now() - new Date(cached.lastSync).getTime() < 86400000);
  const hasDescription = cached?.data?.description;

  let media: Media | null = null;

  if (isFresh && hasDescription) {
    media = cached.data;
  } else {
    console.log(`[QuickEditor] Media not in cache, stale, or missing description, fetching from network...`);
    const fetched = await fetchMediaSummaryWithDescription(mediaId);
    if (fetched) {
      await CacheService.setMedia(mediaId.toString(), { data: fetched, lastSync: new Date().toISOString() });
      console.log(`[QuickEditor] Network fetch complete and cached:`, fetched);
      media = fetched;
    }
  }

  const user = await AuthService.getCurrentUser();
  console.log(`[QuickEditor] User status:`, user ? `Logged in (${user.id})` : "Not logged in");

  let listEntry = null;
  if (user && media) {
    listEntry = await fetchUserListEntry(user.id, media.media_id, type);
    console.log(`[QuickEditor] List entry fetched:`, listEntry);
  } else {
    console.log(`[QuickEditor] Skipping list entry fetch (user: ${!!user}, media: ${!!media})`);
  }

  const entry = media ? {
    ...media,
    id: media.media_id,
    type: type,
    title: media.title?.romaji || media.title,
    total: type === 'anime' ? (media as any).episodes : (media as any).chapters,
    totalChapters: (media as any).chapters,
    totalVolumes: (media as any).volumes,
    description: media.description,
    status: listEntry?.status || 'planning',
    score: listEntry?.score || 0,
    progress: listEntry?.progress || 0,
    progress_volumes: listEntry?.progress_volumes || 0,
    startedAt: listEntry?.startedAt,
    completedAt: listEntry?.completedAt,
    rawMetadata: media
  } : null;

  ui.modalData = {
    entry: entry ? { ...entry, ...listEntry } : null,
    profileId: user?.id,
    isFetching: false
  };
}
