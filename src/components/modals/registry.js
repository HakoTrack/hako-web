import QuickEditorModal from './QuickEditorModal.svelte';
import LoginModal from './LoginModal.svelte';
import SignupModal from './SignupModal.svelte';

export const MODAL_REGISTRY = {
  'quick-editor': QuickEditorModal,
  'login': LoginModal,
  'signup': SignupModal
};
