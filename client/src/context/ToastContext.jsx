import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

/**
 * Toast Provider
 * Usage: const { addToast } = useToast();
 * addToast('success' | 'error' | 'info', '메시지', duration_ms?)
 */
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timers = useRef({});

    const removeToast = useCallback((id) => {
        clearTimeout(timers.current[id]);
        delete timers.current[id];
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((type, message, duration = 3500) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, type, message }]);
        timers.current[id] = setTimeout(() => removeToast(id), duration);
        return id;
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within a ToastProvider');
    return ctx;
}

// ── 토스트 컨테이너 ────────────────────────────────────────────
function ToastContainer({ toasts, onRemove }) {
    if (toasts.length === 0) return null;
    return (
        <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-80 pointer-events-none">
            {toasts.map(t => (
                <ToastItem key={t.id} toast={t} onRemove={onRemove} />
            ))}
        </div>
    );
}

function ToastItem({ toast, onRemove }) {
    const { id, type, message } = toast;
    const styles = {
        success: 'bg-green-50 border-green-300 text-green-800',
        error:   'bg-red-50 border-red-300 text-red-800',
        info:    'bg-blue-50 border-blue-300 text-blue-800',
    };
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };

    return (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-md
            text-sm pointer-events-auto animate-fade-in ${styles[type] || styles.info}`}>
            <span className="text-base leading-none mt-0.5 shrink-0">{icons[type] || icons.info}</span>
            <span className="flex-1 leading-snug">{message}</span>
            <button
                onClick={() => onRemove(id)}
                className="shrink-0 opacity-50 hover:opacity-100 transition text-lg leading-none">
                ✕
            </button>
        </div>
    );
}
