// Key-optionaler Claude-API-Client (native fetch, ohne SDK).
// Ist kein ANTHROPIC_API_KEY gesetzt, werfen die Aufrufe 'AI_NOT_CONFIGURED' –
// die Routen liefern dann einen sinnvollen Demo-Fallback.
//
// Modell-Default: claude-opus-4-7 (per ANTHROPIC_MODEL überschreibbar, z. B.
// claude-haiku-4-5 für kostengünstigeren Betrieb).

const API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7';

function isConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

// system: String (wird als cache-fähiger System-Block gesendet)
// messages: [{ role: 'user'|'assistant', content: string }]
async function callClaude({ system, messages, maxTokens = 1024, model }) {
  if (!isConfigured()) {
    const err = new Error('AI_NOT_CONFIGURED');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const body = {
    model: model || DEFAULT_MODEL,
    max_tokens: maxTokens,
    messages,
  };
  if (system) {
    // System als Array mit Prompt-Caching auf dem stabilen Wissensblock.
    body.system = [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }];
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`AI_API_ERROR ${res.status}: ${text.slice(0, 300)}`);
    err.code = 'AI_API_ERROR';
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const out = Array.isArray(data.content)
    ? data.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim()
    : '';
  return out;
}

module.exports = { callClaude, isConfigured, DEFAULT_MODEL };
