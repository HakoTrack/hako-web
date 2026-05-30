import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

const { subscribe, update } = writable<Toast[]>([]);

export const toasts = {
  subscribe,
  add: (type: ToastType, message: string, duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    update((t) => [...t, { id, type, message, duration }]);
    setTimeout(() => toasts.remove(id), duration);
  },
  remove: (id: string) => {
    update((t) => t.filter((toast) => toast.id !== id));
  }
};

export const toast = {
  success: (message: string, duration?: number) => toasts.add('success', message, duration),
  error: (message: string, duration?: number) => toasts.add('error', message, duration),
  info: (message: string, duration?: number) => toasts.add('info', message, duration),
  warning: (message: string, duration?: number) => toasts.add('warning', message, duration),
};
