import { onMount, onDestroy } from 'svelte';

type KeyCallback = (e: KeyboardEvent) => void;

interface Shortcut {
  key: string;
  callback: KeyCallback;
  ctrl?: boolean;
}

let shortcuts: Shortcut[] = [];

function handleKeydown(e: KeyboardEvent) {
  // Ignore keys pressed in input fields
  if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
    return;
  }

  for (const shortcut of shortcuts) {
    if (e.key === shortcut.key && (!!shortcut.ctrl === e.ctrlKey)) {
      shortcut.callback(e);
    }
  }
}

export function registerShortcut(key: string, callback: KeyCallback, ctrl = false): () => void {
  const shortcut = { key, callback, ctrl };
  shortcuts.push(shortcut);
  return () => {
    shortcuts = shortcuts.filter(s => s !== shortcut);
  };
}

export function initShortcuts() {
  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
}
