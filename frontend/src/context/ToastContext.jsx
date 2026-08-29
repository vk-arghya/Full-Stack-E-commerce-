import { createContext, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2600);
  }

  return <ToastContext.Provider value={{ showToast }}>
    {children}
    {toast && (
      <div className={`fixed left-1/2 top-1/2 z-[300] w-[min(calc(100vw-32px),520px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl px-5 py-4 text-center text-sm font-bold text-white shadow-[0_25px_90px_rgba(20,10,5,.28)] backdrop-blur ${toast.type === 'error' ? 'bg-red-700' : 'bg-stone-900'}`}>
        {toast.type === 'success' ? '✓ ' : '⚠ '}{toast.message}
      </div>
    )}
  </ToastContext.Provider>;
}

export const useToast = () => useContext(ToastContext);
