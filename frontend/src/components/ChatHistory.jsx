import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPost } from '../api';

export default function ChatHistory({ inquiryId, onStatusChange }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [messageType, setMessageType] = useState('admin');
  const bottomRef = useRef(null);

  useEffect(() => {
    loadMessages();
  }, [inquiryId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const res = await apiGet(`/api/admin/inquiries/${inquiryId}/messages`);
      if (res.ok) setMessages(await res.json());
    } catch {
      // ignore
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const body = { message: newMessage.trim() };
      if (messageType === 'customer_order') {
        body.sender_type = 'customer_order';
      }
      const res = await apiPost(`/api/admin/inquiries/${inquiryId}/messages`, body);
      if (res.ok) {
        const data = await res.json();
        setNewMessage('');
        setMessageType('admin');
        loadMessages();
        if (data.status_changed && onStatusChange) {
          onStatusChange(data.status_changed);
        }
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="card mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Kommunikations-Archiv</h2>

      <div className="max-h-96 overflow-y-auto space-y-3 mb-4 p-3 bg-earth-50 rounded-xl">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Noch keine Nachrichten.</p>
        )}

        {messages.map((msg) => {
          const isAdmin = msg.sender_type === 'admin';
          const isSystem = msg.sender_type === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-full max-w-xs text-center">
                  {msg.message}
                  <span className="block text-gray-400 text-[10px] mt-0.5">{formatTime(msg.created_at)}</span>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                isAdmin
                  ? 'bg-primary-500 text-white rounded-br-sm'
                  : 'bg-white border border-earth-200 text-gray-800 rounded-bl-sm'
              }`}>
                <p className={`text-xs font-medium mb-1 ${isAdmin ? 'text-primary-100' : 'text-gray-400'}`}>
                  {msg.sender_name || (isAdmin ? 'Admin' : 'Kunde')}
                </p>
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <p className={`text-[10px] mt-1 ${isAdmin ? 'text-primary-200' : 'text-gray-400'}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            value={messageType}
            onChange={(e) => setMessageType(e.target.value)}
            className="form-input w-auto text-sm"
          >
            <option value="admin">Admin-Nachricht</option>
            <option value="customer_order">Kunden-Auftragserteilung</option>
          </select>
          {messageType === 'customer_order' && (
            <span className="text-xs text-amber-600 self-center">Status wird auf "Auftrag erteilt" gesetzt</span>
          )}
        </div>
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={messageType === 'customer_order' ? 'Auftragserteilung des Kunden dokumentieren...' : 'Nachricht eingeben...'}
            className="form-input flex-1 text-sm"
            rows={2}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            className="btn-primary text-sm py-2 px-4 self-end disabled:opacity-40"
          >
            {sending ? '...' : 'Senden'}
          </button>
        </div>
      </div>
    </div>
  );
}
