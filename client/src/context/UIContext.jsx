import { createContext, useContext, useState, useCallback, useRef } from 'react';

const UIContext = createContext(null);

// Controla o modal global de adicionar/editar, o refreshKey (recarregar páginas) e toasts
export function UIProvider({ children }) {
  const [add, setAdd] = useState({ open: false, type: 'income', item: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [toastMsg, setToastMsg] = useState(null);
  const toastTimer = useRef(null);

  function openAdd(type, item = null) {
    setAdd({ open: true, type: type || 'income', item });
  }
  function closeAdd() {
    setAdd((a) => ({ ...a, open: false }));
  }
  function bumpRefresh() {
    setRefreshKey((k) => k + 1);
  }
  const toast = useCallback((msg) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2200);
  }, []);

  return (
    <UIContext.Provider value={{ add, openAdd, closeAdd, refreshKey, bumpRefresh, toastMsg, toast }}>
      {children}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </UIContext.Provider>
  );
}

export function useUI() {
  return useContext(UIContext);
}