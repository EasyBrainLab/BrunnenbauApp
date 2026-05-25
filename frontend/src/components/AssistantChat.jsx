import { useState, useRef, useEffect } from 'react';
import { apiGet, apiPost } from '../api';

// Schwebender KI-Assistent (Onboarding/Hilfe), auf allen Admin-Seiten verfügbar.
export default function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hallo! Ich bin Ihr Assistent. Fragen Sie mich z. B. „Wie lege ich eine Stückliste an?" oder „Wie ändere ich ein Feld in eine Auswahlliste?".' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (open && configured === null) {
      apiGet('/api/assistant/status').then((r) => r.ok ? r.json() : { configured: false }).then((d) => setConfigured(!!d.configured)).catch(() => setConfigured(false));
    }
  }, [open, configured]);

  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [messages, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const payload = next.filter((m) => m.role === 'user' || m.role === 'assistant');
      const res = await apiPost('/api/assistant/chat', { messages: payload });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: res.ok ? data.reply : (data.error || 'Es ist ein Fehler aufgetreten.') }]);
      if (data.demo) setConfigured(false);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Verbindungsfehler – bitte erneut versuchen.' }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg w-14 h-14 flex items-center justify-center"
          title="KI-Assistent"
          aria-label="KI-Assistent öffnen"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4v-4z" />
          </svg>
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(92vw,380px)] h-[min(80vh,560px)] bg-white rounded-2xl shadow-2xl border border-earth-200 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-earth-100 bg-primary-500 text-white rounded-t-2xl">
            <div>
              <p className="font-heading font-semibold leading-tight">KI-Assistent</p>
              <p className="text-[10px] opacity-90">{configured === false ? 'Handbuch-Modus' : configured ? 'KI aktiv' : '…'}</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Schließen" className="hover:opacity-80">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div ref={bodyRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-earth-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary-500 text-white' : 'bg-white border border-earth-200 text-gray-700'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {busy && <div className="text-xs text-gray-400 px-1">Assistent schreibt…</div>}
          </div>

          <div className="p-3 border-t border-earth-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
              placeholder="Ihre Frage…"
              className="form-input flex-1 text-sm"
              disabled={busy}
            />
            <button onClick={send} disabled={busy || !input.trim()} className="btn-primary text-sm px-4 disabled:opacity-40">Senden</button>
          </div>
        </div>
      )}
    </>
  );
}
