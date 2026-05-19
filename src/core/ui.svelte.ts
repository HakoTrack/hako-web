import { AuthService } from '../core/auth';
import { fetchUserListEntry } from '../utils/mediaData';

export interface ModalData {
  entry?: any;
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

export async function openQuickEditor(media: any, type: string = 'anime') {
  const user = await AuthService.getCurrentUser();

  // Construct a standard entry object
  let entry = {
    ...media,
    id: media.media_id || media.id,
    type: type,
    title: media.title?.romaji || media.title,
    total: media.episodes,
    rawMetadata: media
  };

  // If logged in, fetch and merge existing list progress
  if (user) {
    const listEntry = await fetchUserListEntry(user.id, entry.id, type);
    if (listEntry) {
      entry = { ...entry, ...listEntry };
    }
  }

  // Open the modal with the fully-populated entry
  openModal('quick-editor', { entry });
}
