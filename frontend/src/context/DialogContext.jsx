import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const DialogContext = createContext(null);

function DialogModal({ state, onConfirm, onCancel }) {
  if (!state) return null;

  const isConfirm = state.variant === 'confirm';
  const toneClasses = state.tone === 'danger' || state.tone === 'error'
    ? 'border-red-200 bg-red-50 text-red-700'
    : state.tone === 'success'
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-blue-200 bg-blue-50 text-blue-700';

  const confirmClasses = state.tone === 'danger' || state.tone === 'error'
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-300'
    : 'bg-primary-500 hover:bg-primary-600 focus:ring-primary-300';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-earth-200 bg-white shadow-2xl">
        <div className="border-b border-earth-100 px-6 py-5">
          <h2 className="text-xl font-heading font-semibold text-gray-900">{state.title}</h2>
        </div>
        <div className="px-6 py-5">
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${toneClasses}`}>
            {state.message}
          </div>
          {state.details && (
            <div className="rounded-xl bg-earth-50 px-4 py-3 text-sm leading-6 text-gray-600">
              {state.details}
            </div>
          )}
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-earth-100 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary !px-5 !py-2.5"
          >
            {isConfirm ? (state.cancelLabel || 'Abbrechen') : 'Schliessen'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmClasses}`}
          >
            {isConfirm ? (state.confirmLabel || 'Bestaetigen') : 'Verstanden'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DialogProvider({ children }) {
  const resolverRef = useRef(null);
  const [dialogState, setDialogState] = useState(null);

  const closeDialog = useCallback((result) => {
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
    setDialogState(null);
  }, []);

  const confirm = useCallback((config) => new Promise((resolve) => {
    resolverRef.current = resolve;
    setDialogState({
      variant: 'confirm',
      title: config.title || 'Aktion bestaetigen',
      message: config.message || 'Moechten Sie diese Aktion wirklich ausfuehren?',
      details: config.details || '',
      confirmLabel: config.confirmLabel || 'Ja, fortfahren',
      cancelLabel: config.cancelLabel || 'Abbrechen',
      tone: config.tone || 'info',
    });
  }), []);

  const alert = useCallback((config) => new Promise((resolve) => {
    resolverRef.current = resolve;
    setDialogState({
      variant: 'alert',
      title: config.title || 'Hinweis',
      message: config.message || '',
      details: config.details || '',
      tone: config.tone || 'info',
    });
  }), []);

  const value = useMemo(() => ({ confirm, alert }), [confirm, alert]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      <DialogModal
        state={dialogState}
        onConfirm={() => closeDialog(true)}
        onCancel={() => closeDialog(false)}
      />
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog muss innerhalb von DialogProvider verwendet werden');
  }
  return context;
}
