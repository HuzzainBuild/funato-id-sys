'use client';
// hooks/useToast.tsx

import { useState, useCallback, useEffect } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

const ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
const COLORS = {
  success: { bg: '#16a34a', border: '#15803d' },
  error: { bg: '#dc2626', border: '#b91c1c' },
  warning: { bg: '#d97706', border: '#b45309' },
  info: { bg: '#2563eb', border: '#1d4ed8' },
};

export function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 380 }}>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  const colors = COLORS[toast.type];

  return (
    <div
      className="pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-xl shadow-xl text-white animate-slide-up"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        fontFamily: 'Lexend, sans-serif',
      }}
    >
      <span className="text-xl flex-shrink-0 mt-0.5">{ICONS[toast.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">{toast.title}</p>
        {toast.message && <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{toast.message}</p>}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-white/60 hover:text-white text-lg leading-none flex-shrink-0 mt-0.5 transition-colors"
      >
        ×
      </button>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message, duration: 6000 });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message });
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  }, [addToast]);

  return { toasts, removeToast, success, error, warning, info };
}
