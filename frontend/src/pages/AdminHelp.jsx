import { useState, useMemo } from 'react';
import { HANDBOOK } from '../data/handbookContent';

export default function AdminHelp() {
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(HANDBOOK[0]?.id || null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return HANDBOOK;
    return HANDBOOK.filter((s) =>
      (s.title + ' ' + s.category + ' ' + s.keywords + ' ' + s.body.join(' ')).toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="px-6 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-semibold text-primary-500">Hilfe &amp; Handbuch</h1>
        <p className="text-gray-500">Antworten zu allen Funktionen. Nutzen Sie die Suche oder klappen Sie ein Thema auf.</p>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Im Handbuch suchen… (z. B. Werteliste, Stückliste, Logo)"
        className="form-input w-full mb-6"
      />

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Keine Treffer für „{search}".</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => {
            const open = openId === s.id || !!search.trim();
            return (
              <div key={s.id} className="border border-earth-200 rounded-lg bg-white">
                <button
                  type="button"
                  onClick={() => setOpenId(openId === s.id ? null : s.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-earth-50 rounded-t-lg"
                >
                  <span>
                    <span className="text-[11px] font-semibold text-primary-400 uppercase tracking-wide block">{s.category}</span>
                    <span className="font-medium text-gray-800">{s.title}</span>
                  </span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {open && (
                  <div className="px-4 pb-4 pt-1 space-y-2">
                    {s.body.map((p, i) => <p key={i} className="text-sm text-gray-600 leading-relaxed">{p}</p>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        Weitere Hilfe nötig? Ein KI-Assistent zur direkten Beantwortung von Fragen ist in Vorbereitung und wird hier integriert.
      </div>
    </div>
  );
}
