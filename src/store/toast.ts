import { create } from 'zustand';

export type ToastVariant = 'default' | 'success' | 'error';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    // Auto-dismiss after 5s.
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    }, 5000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

/** Convenience helpers usable outside React (e.g. mutation callbacks). */
export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ title, variant: 'success', ...(description ? { description } : {}) }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push({ title, variant: 'error', ...(description ? { description } : {}) }),
  info: (title: string, description?: string) =>
    useToastStore.getState().push({ title, variant: 'default', ...(description ? { description } : {}) }),
};
