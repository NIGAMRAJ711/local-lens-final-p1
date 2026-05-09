import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: { bg: '#f0fdf4', border: '#22c55e', icon: '#16a34a', darkBg: '#14532d' },
  error:   { bg: '#fef2f2', border: '#ef4444', icon: '#dc2626', darkBg: '#7f1d1d' },
  warning: { bg: '#fffbeb', border: '#f59e0b', icon: '#d97706', darkBg: '#78350f' },
  info:    { bg: '#eff6ff', border: '#3b82f6', icon: '#2563eb', darkBg: '#1e3a5f' },
};

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

function Toast({ id, title, subtitle, type, onRemove }) {
  const [progress, setProgress] = useState(100);
  const s = STYLES[type] || STYLES.info;
  const Icon = ICONS[type] || Info;
  const DURATION = type === 'error' ? 5000 : 3500;

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(pct);
      if (pct === 0) clearInterval(interval);
    }, 30);
    const timer = setTimeout(() => onRemove(id), DURATION);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, []);

  return (
    <div
      style={{
        background: s.bg,
        borderLeft: `4px solid ${s.border}`,
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        overflow: 'hidden',
        animation: 'toastSlideIn 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        pointerEvents: 'auto',
        minWidth: 280,
        maxWidth: 360,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 14px 16px 14px' }}>
        <Icon size={20} color={s.icon} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#1a1a1a', lineHeight: 1.3 }}>{title}</p>
          {subtitle && <p style={{ margin: '3px 0 0', fontSize: 12, color: '#555', lineHeight: 1.4 }}>{subtitle}</p>}
        </div>
        <button onClick={() => onRemove(id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#999', flexShrink: 0, lineHeight: 1 }}>
          <X size={15} />
        </button>
      </div>
      {/* Shrinking progress bar */}
      <div style={{ height: 3, background: `${s.border}22`, position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <div style={{ height: '100%', background: s.border, width: `${progress}%`, transition: 'width 0.03s linear', borderRadius: '0 0 12px 12px' }} />
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((title, subtitle, type) => {
    const id = Date.now() + Math.random();
    // If subtitle is a number it's being used as old (msg, duration) api — treat as no subtitle
    const resolvedTitle = typeof title === 'string' ? title : String(title);
    const resolvedSub = typeof subtitle === 'string' ? subtitle : undefined;
    setToasts(prev => [...prev.slice(-4), { id, title: resolvedTitle, subtitle: resolvedSub, type }]);
    return id;
  }, []);

  const toast = {
    success: (title, subtitle) => addToast(title, subtitle, 'success'),
    error:   (title, subtitle) => addToast(title, subtitle, 'error'),
    warning: (title, subtitle) => addToast(title, subtitle, 'warning'),
    info:    (title, subtitle) => addToast(title, subtitle, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', bottom: 20, right: 20,
        display: 'flex', flexDirection: 'column', gap: 8,
        zIndex: 9999, pointerEvents: 'none',
        alignItems: 'flex-end',
      }}
        className="toast-container"
      >
        {toasts.map(t => (
          <Toast key={t.id} {...t} onRemove={removeToast} />
        ))}
      </div>
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(60px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @media (max-width: 600px) {
          .toast-container { right: 0 !important; left: 0 !important; align-items: center !important; bottom: 12px !important; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

// Confirm Dialog (unchanged)
export function useConfirm() {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback((message, title = 'Confirm') => {
    return new Promise((resolve) => {
      setDialog({ message, title, resolve });
    });
  }, []);

  const ConfirmDialog = dialog ? (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" style={{ animation: 'toastSlideIn 0.25s ease-out' }}>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{dialog.title}</h3>
        <p className="text-gray-600 text-sm mb-6">{dialog.message}</p>
        <div className="flex gap-3">
          <button onClick={() => { setDialog(null); dialog.resolve(false); }}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={() => { setDialog(null); dialog.resolve(true); }}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition">
            Confirm
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, ConfirmDialog };
}
