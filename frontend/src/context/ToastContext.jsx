import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: { bg: '#f0fdf4', border: '#22c55e', iconColor: '#16a34a', titleColor: '#14532d', subColor: '#166534' },
  error:   { bg: '#fef2f2', border: '#ef4444', iconColor: '#dc2626', titleColor: '#7f1d1d', subColor: '#991b1b' },
  info:    { bg: '#eff6ff', border: '#3b82f6', iconColor: '#2563eb', titleColor: '#1e3a8a', subColor: '#1d4ed8' },
  warning: { bg: '#fffbeb', border: '#f59e0b', iconColor: '#d97706', titleColor: '#78350f', subColor: '#92400e' },
};

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const DURATION = 3500;

function ToastItem({ id, type, title, subtitle, onRemove }) {
  const s = STYLES[type] || STYLES.info;
  const Icon = ICONS[type] || Info;
  const [progress, setProgress] = useState(100);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef(null);

  // Slide in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const step = 100 / (DURATION / 50);
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p <= 0) { clearInterval(intervalRef.current); return 0; }
        return p - step;
      });
    }, 50);
    return () => clearInterval(intervalRef.current);
  }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => onRemove(id), 300);
  };

  return (
    <div
      onClick={dismiss}
      style={{
        background: s.bg,
        borderLeft: `4px solid ${s.border}`,
        borderRadius: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        overflow: 'hidden',
        cursor: 'pointer',
        transform: visible ? 'translateX(0)' : 'translateX(calc(100% + 24px))',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
        minWidth: 280,
        maxWidth: 360,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 14px 16px 14px' }}>
        <Icon style={{ width: 20, height: 20, color: s.iconColor, flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: s.titleColor, lineHeight: 1.3 }}>{title}</p>
          {subtitle && <p style={{ margin: '3px 0 0', fontSize: 13, color: s.subColor, lineHeight: 1.4 }}>{subtitle}</p>}
        </div>
        <button
          onClick={e => { e.stopPropagation(); dismiss(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#9ca3af', flexShrink: 0, marginTop: -1 }}
        >
          <X style={{ width: 16, height: 16 }} />
        </button>
      </div>
      {/* Shrinking progress bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, height: 3, background: s.border, width: `${progress}%`, transition: 'width 50ms linear', opacity: 0.6 }} />
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, title, subtitle) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, type, title, subtitle }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, DURATION + 400);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (title, subtitle) => addToast('success', title, subtitle),
    error:   (title, subtitle) => addToast('error', title, subtitle),
    info:    (title, subtitle) => addToast('info', title, subtitle),
    warning: (title, subtitle) => addToast('warning', title, subtitle),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end',
        pointerEvents: 'none',
      }}
        className="toast-container"
      >
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem {...t} onRemove={removeToast} />
          </div>
        ))}
      </div>
      <style>{`
        @media (max-width: 640px) {
          .toast-container { right: 12px !important; left: 12px !important; align-items: stretch !important; }
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

// Confirm Dialog Component (unchanged)
export function useConfirm() {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback((message, title = 'Confirm') => {
    return new Promise((resolve) => {
      setDialog({ message, title, resolve });
    });
  }, []);

  const ConfirmDialog = dialog ? (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
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
