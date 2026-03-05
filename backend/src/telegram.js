const https = require('https');

const WELL_TYPE_LABELS = {
  gespuelt: 'Gespuelter Brunnen',
  handpumpe: 'Gartenbrunnen (Handpumpe)',
  tauchpumpe: 'Gartenbrunnen (Tauchpumpe)',
  hauswasserwerk: 'Hauswasserwerk',
  tiefbrunnen: 'Tiefbrunnen (High-End)',
  industrie: 'Industriebrunnen',
  beratung: 'Beratung gewuenscht',
};

function telegramRequest(method, body) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return Promise.resolve(null);

  const data = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${token}/${method}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve(JSON.parse(body)));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Benachrichtigung an Admin-Chat bei neuer Anfrage
async function sendTelegramNotification(inquiry) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId || !process.env.TELEGRAM_BOT_TOKEN) return;

  const text =
    `🔔 *Neue Brunnenanfrage*\n\n` +
    `*ID:* \`${inquiry.inquiry_id}\`\n` +
    `*Name:* ${inquiry.first_name} ${inquiry.last_name}\n` +
    `*E-Mail:* ${inquiry.email}\n` +
    `*Telefon:* ${inquiry.phone || '–'}\n` +
    `*Ort:* ${inquiry.zip_code} ${inquiry.city}\n` +
    `*Brunnenart:* ${WELL_TYPE_LABELS[inquiry.well_type] || inquiry.well_type}\n` +
    `*Vor-Ort-Termin:* ${inquiry.site_visit_requested ? 'Ja' : 'Nein'}`;

  await telegramRequest('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
  });
}

// Bestätigung an Kunden per Telegram (falls Handle angegeben)
async function sendTelegramCustomerConfirmation(inquiry) {
  if (!inquiry.telegram_handle || !process.env.TELEGRAM_BOT_TOKEN) return;

  // Hinweis: Telegram-Bot kann nur an User senden, die /start geschickt haben.
  // telegram_handle wird hier als chat_id interpretiert, falls der Kunde den Bot gestartet hat.
  const text =
    `✅ *Ihre Brunnenanfrage wurde empfangen!*\n\n` +
    `*Anfrage-ID:* \`${inquiry.inquiry_id}\`\n` +
    `*Brunnenart:* ${WELL_TYPE_LABELS[inquiry.well_type] || inquiry.well_type}\n\n` +
    `Wir melden uns in Kuerze bei Ihnen.\n` +
    `Ihr Brunnenbau-Team`;

  try {
    await telegramRequest('sendMessage', {
      chat_id: inquiry.telegram_handle,
      text,
      parse_mode: 'Markdown',
    });
  } catch (err) {
    console.error('Telegram-Kundenbenachrichtigung fehlgeschlagen:', err.message);
  }
}

module.exports = { sendTelegramNotification, sendTelegramCustomerConfirmation };
