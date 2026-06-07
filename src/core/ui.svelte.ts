import { AuthService } from '../core/auth';
import { fetchUserListEntry, fetchMediaSummaryWithDescription } from '../shared/utils/mediaData';

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
  setFavorites: (ids: number[]) => void;
  addFavorite: (id: number) => void;
  removeFavorite: (id: number) => void;
}

export const ui: UIState = $state({
  activeModal: null,
  modalData: null,
  favoriteIds: new Set<number>(),
  animeListCache: new Map<string, any[]>(),
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
