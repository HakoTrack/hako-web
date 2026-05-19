import QuickEditorModal from './QuickEditorModal.svelte';
import LoginModal from './LoginModal.svelte';
import SignupModal from './SignupModal.svelte';
import SettingsModal from './SettingsModal.svelte';

export type ModalComponent =
  | typeof QuickEditorModal
  | typeof LoginModal
  | typeof SignupModal
  | typeof SettingsModal;

export const MODAL_REGISTRY: Record<string, ModalComponent> = {
  'quick-editor': QuickEditorModal,
  'login': LoginModal,
  'signup': SignupModal,
  'settings': SettingsModal
};
