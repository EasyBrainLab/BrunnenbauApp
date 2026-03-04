import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../api';

function SendQuoteButton({ inquiryId, quoteId }) {
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error'

  const sendQuote = async () => {
    setSending(true);
    setStatus(null);
    try {
      const res = await apiPost(`/api/admin/inquiries/${inquiryId}/send-quote/${quoteId}`, {});
      if (res.ok) {
        setStatus('success');
        setTimeout(() => setStatus(null), 3000);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setSending(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={sendQuote}
        disabled={sending}
        className="text-xs text-accent-600 hover:text-accent-700 flex items-center gap-1 disabled:opacity-40"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {sending ? 'Sende...' : 'Per Email senden'}
      </button>
      {status === 'success' && <span className="text-xs text-green-600">Gesendet!</span>}
      {status === 'error' && <span className="text-xs text-red-600">Fehler</span>}
    </span>
  );
}

export default function QuoteGenerator({ inquiryId, wellType }) {
  const [quotes, setQuotes] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);

  useEffect(() => {
    loadQuotes();
  }, [inquiryId]);

  const loadQuotes = async () => {
    const res = await apiGet(`/api/costs/quotes/${inquiryId}`);
    if (res.ok) setQuotes(await res.json());
  };

  const generateQuote = async () => {
    if (!wellType || wellType === 'beratung') return;
    setGenerating(true);
    try {
      const res = await apiPost('/api/costs/quotes', {
        inquiry_id: inquiryId,
        well_type: wellType,
      });
      if (res.ok) {
        loadQuotes();
        setShowQuotes(true);
      }
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  };

  if (!wellType || wellType === 'beratung') return null;

  return (
    <div className="card mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Angebot / Kalkulation</h2>

      <button onClick={generateQuote} disabled={generating} className="btn-primary text-sm py-2 px-4 mb-4">
        {generating ? 'Wird berechnet...' : 'Neues Angebot generieren'}
      </button>

      {quotes.length > 0 && (
        <>
          <button
            onClick={() => setShowQuotes(!showQuotes)}
            className="text-sm text-primary-500 hover:text-primary-600 ml-4"
          >
            {showQuotes ? 'Angebote verbergen' : `${quotes.length} Angebot(e) anzeigen`}
          </button>

          {showQuotes && (
            <div className="mt-4 space-y-4">
              {quotes.map((q) => (
                <div key={q.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex justify-between text-gray-500 text-xs mb-2">
                    <span>Angebot #{q.id}</span>
                    <span>
                      {new Date(q.created_at).toLocaleDateString('de-DE', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <table className="w-full text-xs mb-2">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-1">Position</th>
                        <th className="pb-1 text-right">Einheit</th>
                        <th className="pb-1 text-right">Preis</th>
                        <th className="pb-1 text-right">Menge</th>
                        <th className="pb-1 text-right">Gesamt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {q.items.map((item, i) => (
                        <tr key={i} className="border-b border-earth-50">
                          <td className="py-1">{item.name}</td>
                          <td className="py-1 text-right">{item.unit}</td>
                          <td className="py-1 text-right">{item.unit_price.toFixed(2)} EUR</td>
                          <td className="py-1 text-right">{item.quantity_min}–{item.quantity_max}</td>
                          <td className="py-1 text-right">{item.total_min.toFixed(0)}–{item.total_max.toFixed(0)} EUR</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await apiPost(`/api/admin/inquiries/${inquiryId}/generate-pdf/${q.id}`, {});
                            if (res.ok) {
                              const data = await res.json();
                              window.open(`/api/uploads/${data.filename}`, '_blank');
                            }
                          } catch { /* ignore */ }
                        }}
                        className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        PDF erstellen
                      </button>
                      <SendQuoteButton inquiryId={inquiryId} quoteId={q.id} />
                    </div>
                    <div className="font-bold text-gray-800">
                      Gesamt: {q.total_min.toFixed(0)} – {q.total_max.toFixed(0)} EUR
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
