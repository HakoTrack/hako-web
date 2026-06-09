import { AuthService } from '../core/auth';
import { ListService } from '../features/profile/services/listService';
import { MetadataService } from '../features/media/services/metadataService';
import { fetchUserListEntry, fetchMediaSummaryWithDescription } from '../shared/utils/mediaData';
import type { QuickUpdateItem } from '../shared/types/index';

export interface ModalData {
  entry?: any;
  profile?: any;
  profileId?: string;
  isFetching?: boolean;
}

export type ModalType = 'quick-editor' | 'login' | 'signup' | 'settings' | 'theme' | null;

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

  const [media, user] = await Promise.all([
    fetchMediaSummaryWithDescription(mediaId),
    AuthService.getCurrentUser()
  ]);

  let listEntry = null;
  if (user && media) {
    listEntry = await fetchUserListEntry(user.id, media.media_id, type);
  }

  const entry = media ? {
    ...media,
    id: media.media_id,
    type: type,
    title: media.title?.romaji || media.title,
    // Add missing properties expected by QuickEditorModal
    total: type === 'anime' ? (media as any).episodes : (media as any).chapters,
    totalChapters: (media as any).chapters,
    totalVolumes: (media as any).volumes,
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
