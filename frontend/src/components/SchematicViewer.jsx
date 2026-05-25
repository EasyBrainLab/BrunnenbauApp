import { useState, useEffect } from 'react';

// Zeigt ein SVG-Schema (oder eine hochgeladene Grafik) als klickbares Thumbnail
// und öffnet bei Klick eine Lightbox mit großer Darstellung + Beschreibung.
// imageUrl hat Vorrang vor dem eingebauten Schema (eigene Grafik des Kunden).
export default function SchematicViewer({ Schema, imageUrl, title, description }) {
  const [open, setOpen] = useState(false);

  // ESC schließt die Lightbox + Body-Scroll sperren, solange offen
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!Schema && !imageUrl) return null;
  const Graphic = ({ large }) => (
    imageUrl
      ? <img src={imageUrl} alt={title || 'Grafik'} className={`w-full h-auto ${large ? 'rounded-lg' : ''}`} />
      : <Schema />
  );

  return (
    <>
      {/* Thumbnail */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full bg-white rounded-lg border border-earth-100 p-2 hover:border-primary-300 hover:shadow-sm transition-all"
        title="Grafik vergrößern"
        aria-label={`${title || 'Schemazeichnung'} vergrößern`}
      >
        <Graphic large={false} />
        <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-primary-500/90 text-white text-[10px] px-1.5 py-0.5 rounded-full opacity-90 group-hover:opacity-100 transition-opacity">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zm-7-3v6m-3-3h6" />
          </svg>
          Vergrößern
        </span>
      </button>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-earth-100 sticky top-0 bg-white rounded-t-xl">
              <h3 className="font-heading font-semibold text-primary-600">{title || 'Schemazeichnung'}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
                aria-label="Schließen"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5">
              <div className="max-w-md mx-auto">
                <Graphic large={true} />
              </div>
              {description && (
                <p className="text-sm text-gray-600 leading-relaxed mt-4">{description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
