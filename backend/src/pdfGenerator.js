const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { getCompanySettingsAsync, getCompanyFooterLine, getCompanyAddressLine } = require('./companySettings');
const { getPrivacyPolicy, formatGermanDate } = require('./privacyPolicy');

function writeParagraphBlock(doc, text, x, y, options = {}) {
  if (!text) return y;
  if (y > (options.pageBreakAt || 720)) {
    doc.addPage();
    y = 50;
  }
  doc.font(options.font || 'Helvetica').fontSize(options.fontSize || 8).fillColor(options.color || '#333333');
  doc.text(text, x, y, { width: options.width || 495, align: options.align || 'left' });
  return doc.y + (options.gapAfter || 10);
}

function renderQuoteItemsTable(doc, quoteItems, startY, primaryColor) {
  const colX = { pos: 50, qty: 310, price: 380, total: 470 };
  let tableTop = Math.max(startY, 260);

  if (tableTop > 700) {
    doc.addPage();
    tableTop = 50;
  }

  doc.rect(50, tableTop, 495, 20).fillColor(primaryColor || '#1b59b7').fill();
  doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
  doc.text('Beschreibung', colX.pos + 5, tableTop + 6);
  doc.text('Menge', colX.qty + 5, tableTop + 6);
  doc.text('Stueckpreis', colX.price + 5, tableTop + 6);
  doc.text('Gesamt', colX.total + 5, tableTop + 6);

  doc.fillColor('#000000').font('Helvetica').fontSize(8);
  let y = tableTop + 25;
  let netto = 0;

  for (let idx = 0; idx < quoteItems.length; idx++) {
    const item = quoteItems[idx];
    if (y > 700) {
      doc.addPage();
      y = 50;
    }
    const bgColor = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
    doc.rect(50, y - 3, 495, 18).fillColor(bgColor).fill();
    doc.fillColor('#000000');

    const qty = item.quantity ?? item.quantity_min;
    const total = item.total ?? (item.unit_price * qty);
    netto += total;

    doc.text(`\u2022  ${item.name}`, colX.pos + 5, y, { width: 250 });
    doc.text(`${qty}`, colX.qty + 5, y);
    doc.text(`${Number(item.unit_price).toFixed(2)} EUR`, colX.price + 5, y);
    doc.text(`${total.toFixed(2)} EUR`, colX.total + 5, y);
    y += 20;
  }

  y += 5;
  const mwst = netto * 0.19;
  const brutto = netto + mwst;

  doc.rect(50, y, 495, 18).fillColor('#f0f0f0').fill();
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);
  doc.text('Netto:', colX.pos + 5, y + 4);
  doc.text(`${netto.toFixed(2)} EUR`, colX.total - 10, y + 4);
  y += 20;

  doc.rect(50, y, 495, 18).fillColor('#f0f0f0').fill();
  doc.fillColor('#000000').font('Helvetica').fontSize(9);
  doc.text('zzgl. 19% MwSt:', colX.pos + 5, y + 4);
  doc.text(`${mwst.toFixed(2)} EUR`, colX.total - 10, y + 4);
  y += 20;

  doc.rect(50, y, 495, 22).fillColor('#e8f0fe').fill();
  doc.fillColor(primaryColor || '#1b59b7').font('Helvetica-Bold').fontSize(10);
  doc.text('Brutto:', colX.pos + 5, y + 5);
  doc.text(`${brutto.toFixed(2)} EUR`, colX.total - 10, y + 5);

  return { y: y + 35, netto, mwst, brutto };
}

async function generateQuotePdf({ inquiry, quote, quoteItems, tenantId }) {
  const cs = await getCompanySettingsAsync(tenantId || inquiry?.tenant_id);
  const layout = {
    showIntro: true,
    showPostItemsText1: true,
    showPostItemsText2: true,
    showFooterText: true,
    showPaymentTerms: true,
    showPdfFooter: true,
    showBankDetails: true,
    showLegalFooter: true,
    ...(() => {
      try {
        return quote.layout_json ? JSON.parse(quote.layout_json) : {};
      } catch {
        return {};
      }
    })(),
  };
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header mit optionalem Logo
      let headerTextX = 50;
      if (cs.logo_path) {
        try {
          // logo_path ist z.B. "/api/uploads/logo.png" → in lokale Datei aufloesen
          const logoFile = path.join(__dirname, '..', 'uploads', path.basename(cs.logo_path));
          if (fs.existsSync(logoFile)) {
            doc.image(logoFile, 50, 45, { height: 40 });
            headerTextX = 100;
          }
        } catch (e) { /* Logo nicht verfuegbar, weiter ohne */ }
      }
      doc.fontSize(20).font('Helvetica-Bold').text(cs.company_name, headerTextX, 50);
      if (cs.tagline) {
        doc.fontSize(9).font('Helvetica').fillColor('#666666')
          .text(cs.tagline, headerTextX, 75);
      }
      doc.moveTo(50, 95).lineTo(545, 95).strokeColor(cs.primary_color || '#1b59b7').lineWidth(1.5).stroke();

      // Firmenadresse (Absenderzeile)
      const companyAddr = getCompanyAddressLine(cs);
      if (companyAddr) {
        doc.fontSize(7).font('Helvetica').fillColor('#999999')
          .text(`${cs.company_name} | ${companyAddr}`, 50, 100);
      }

      // Kundenadresse
      const addrY = companyAddr ? 115 : 110;
      doc.fillColor('#000000').fontSize(10).font('Helvetica');
      doc.text(`${inquiry.first_name || ''} ${inquiry.last_name || ''}`.trim() || 'Kunde', 50, addrY);
      if (inquiry.street) doc.text(`${inquiry.street} ${inquiry.house_number || ''}`, 50, addrY + 15);
      doc.text(`${inquiry.zip_code || ''} ${inquiry.city || ''}`.trim(), 50, addrY + (inquiry.street ? 30 : 15));

      // Angebotsnummer und Datum
      const now = new Date();
      const dateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      doc.font('Helvetica-Bold').text(quote.document_title || cs.quote_document_title || 'Angebot', 380, addrY);
      doc.font('Helvetica').fontSize(9);
      doc.text(`Nr.: ANG-${quote.id}`, 380, addrY + 17);
      doc.text(`Datum: ${dateStr}`, 380, addrY + 30);
      doc.text(`Anfrage: ${inquiry.inquiry_id}`, 380, addrY + 43);
      if (cs.quote_validity_days) {
        const validUntil = new Date(now);
        validUntil.setDate(validUntil.getDate() + parseInt(cs.quote_validity_days));
        doc.text(`Gueltig bis: ${validUntil.toLocaleDateString('de-DE')}`, 380, addrY + 56);
      }

      // Betreff
      doc.fontSize(13).font('Helvetica-Bold').fillColor(cs.primary_color || '#1b59b7')
        .text(quote.document_title || cs.quote_document_title || 'Kostenvoranschlag Brunnenbau', 50, 190);
      doc.fillColor('#000000');

      // Frei angeordnete Inhaltsbloecke innerhalb eines stabilen A4-Flows
      const kundenName = `${inquiry.first_name || ''} ${inquiry.last_name || ''}`.trim();
      const introText = quote.intro_text || `Sehr geehrte(r) ${kundenName || 'Kunde'},\n\nvielen Dank fuer Ihre Anfrage. Nachfolgend unser Kostenvoranschlag:`;
      let y = 215;

      const renderers = {
        intro: () => {
          if (!layout.showIntro || !introText) return;
          y = writeParagraphBlock(doc, introText, 50, y, { fontSize: 9, gapAfter: 18, color: '#000000' });
        },
        items: () => {
          const result = renderQuoteItemsTable(doc, quoteItems, y, cs.primary_color || '#1b59b7');
          y = result.y;
        },
        post_items_text_1: () => {
          if (!layout.showPostItemsText1) return;
          y = writeParagraphBlock(doc, quote.post_items_text_1, 50, y, { fontSize: 8, gapAfter: 8 });
        },
        post_items_text_2: () => {
          if (!layout.showPostItemsText2) return;
          y = writeParagraphBlock(doc, quote.post_items_text_2, 50, y, { fontSize: 8, gapAfter: 8 });
        },
        payment_terms: () => {
          if (!layout.showPaymentTerms) return;
          y = writeParagraphBlock(doc, cs.payment_terms, 50, y, { fontSize: 8, gapAfter: 8, color: '#000000' });
        },
        footer_text: () => {
          if (!layout.showFooterText) return;
          y = writeParagraphBlock(doc, quote.footer_text, 50, y, { fontSize: 8, gapAfter: 8 });
        },
        pdf_footer_text: () => {
          if (!layout.showPdfFooter) return;
          y = writeParagraphBlock(doc, cs.pdf_footer_text, 50, y, { fontSize: 7, gapAfter: 10, color: '#666666' });
        },
      };

      for (const blockKey of Array.isArray(layout.blockOrder) ? layout.blockOrder : []) {
        renderers[blockKey]?.();
      }

      // Bankverbindung
      if (layout.showBankDetails && cs.bank_iban) {
        doc.fontSize(7).fillColor('#666666');
        const bankLine = [cs.bank_name, `IBAN: ${cs.bank_iban}`, cs.bank_bic ? `BIC: ${cs.bank_bic}` : ''].filter(Boolean).join(' | ');
        doc.text(bankLine, 50, 760, { align: 'center', width: 495 });
      }

      // Rechtliche Angaben
      if (layout.showLegalFooter) {
        const legalParts = [];
        if (cs.managing_director) legalParts.push(`GF: ${cs.managing_director}`);
        if (cs.trade_register_court && cs.trade_register_number) legalParts.push(`${cs.trade_register_court} ${cs.trade_register_number}`);
        if (cs.court_of_jurisdiction) legalParts.push(`Gerichtsstand: ${cs.court_of_jurisdiction}`);
        if (cs.tax_number) legalParts.push(`St-Nr.: ${cs.tax_number}`);
        if (cs.vat_id) legalParts.push(`USt-IdNr.: ${cs.vat_id}`);
        if (legalParts.length > 0) {
          doc.fontSize(6).fillColor('#999999');
          doc.text(legalParts.join(' | '), 50, 770, { align: 'center', width: 495 });
        }
      }

      // Footer
      doc.fontSize(7).fillColor('#999999');
      doc.text(getCompanyFooterLine(cs), 50, 780, { align: 'center', width: 495 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function generatePrivacyPolicyPdf({ tenantId }) {
  const { title, bodyText, lastUpdated, settings } = await getPrivacyPolicy(tenantId);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      let y = 50;
      doc.fontSize(20).font('Helvetica-Bold').fillColor(settings.primary_color || '#1b59b7').text(title, 50, y);
      y = doc.y + 6;
      doc.fontSize(9).font('Helvetica').fillColor('#666666').text(`Stand: ${formatGermanDate(lastUpdated)}`, 50, y);
      y = doc.y + 16;
      doc.moveTo(50, y).lineTo(545, y).strokeColor(settings.primary_color || '#1b59b7').lineWidth(1.2).stroke();
      y += 18;

      doc.fillColor('#000000').font('Helvetica').fontSize(10);
      for (const paragraph of bodyText.split(/\n{2,}/)) {
        if (y > 730) {
          doc.addPage();
          y = 50;
        }
        doc.text(paragraph, 50, y, { width: 495, align: 'left' });
        y = doc.y + 12;
      }

      doc.fontSize(8).fillColor('#999999').text(getCompanyFooterLine(settings), 50, 780, { align: 'center', width: 495 });
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateQuotePdf, generatePrivacyPolicyPdf };
