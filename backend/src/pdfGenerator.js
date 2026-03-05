const PDFDocument = require('pdfkit');

function generateQuotePdf({ inquiry, quote, quoteItems }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('Lies-Brunnenbau', 50, 50);
      doc.fontSize(9).font('Helvetica').fillColor('#666666')
        .text('Ihr Partner fuer professionellen Brunnenbau', 50, 75);
      doc.moveTo(50, 95).lineTo(545, 95).strokeColor('#1b59b7').lineWidth(1.5).stroke();

      // Kundenadresse
      doc.fillColor('#000000').fontSize(10).font('Helvetica');
      doc.text(`${inquiry.first_name} ${inquiry.last_name}`, 50, 115);
      doc.text(`${inquiry.street} ${inquiry.house_number}`, 50, 130);
      doc.text(`${inquiry.zip_code} ${inquiry.city}`, 50, 145);

      // Angebotsnummer und Datum
      const now = new Date();
      const dateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      doc.font('Helvetica-Bold').text('Angebot', 380, 115);
      doc.font('Helvetica').fontSize(9);
      doc.text(`Nr.: ANG-${quote.id}`, 380, 132);
      doc.text(`Datum: ${dateStr}`, 380, 145);
      doc.text(`Anfrage: ${inquiry.inquiry_id}`, 380, 158);

      // Betreff
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#1b59b7')
        .text('Kostenvoranschlag Brunnenbau', 50, 190);
      doc.fillColor('#000000');

      // Einleitung
      doc.fontSize(9).font('Helvetica')
        .text(`Sehr geehrte(r) ${inquiry.first_name} ${inquiry.last_name},`, 50, 215)
        .text('vielen Dank fuer Ihre Anfrage. Nachfolgend unser Kostenvoranschlag:', 50, 230);

      // Tabelle
      const tableTop = 260;
      const colX = { pos: 50, qty: 310, price: 380, total: 470 };

      // Header-Zeile
      doc.rect(50, tableTop, 495, 20).fillColor('#1b59b7').fill();
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
      doc.text('Beschreibung', colX.pos + 5, tableTop + 6);
      doc.text('Menge', colX.qty + 5, tableTop + 6);
      doc.text('Stueckpreis', colX.price + 5, tableTop + 6);
      doc.text('Gesamt', colX.total + 5, tableTop + 6);

      // Positionen
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

      // Summenzeilen: Netto, MwSt, Brutto
      y += 5;
      const mwst = netto * 0.19;
      const brutto = netto + mwst;

      // Netto
      doc.rect(50, y, 495, 18).fillColor('#f0f0f0').fill();
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);
      doc.text('Netto:', colX.pos + 5, y + 4);
      doc.text(`${netto.toFixed(2)} EUR`, colX.total - 10, y + 4);
      y += 20;

      // MwSt
      doc.rect(50, y, 495, 18).fillColor('#f0f0f0').fill();
      doc.fillColor('#000000').font('Helvetica').fontSize(9);
      doc.text('zzgl. 19% MwSt:', colX.pos + 5, y + 4);
      doc.text(`${mwst.toFixed(2)} EUR`, colX.total - 10, y + 4);
      y += 20;

      // Brutto
      doc.rect(50, y, 495, 22).fillColor('#e8f0fe').fill();
      doc.fillColor('#1b59b7').font('Helvetica-Bold').fontSize(10);
      doc.text('Brutto:', colX.pos + 5, y + 5);
      doc.text(`${brutto.toFixed(2)} EUR`, colX.total - 10, y + 5);
      y += 35;

      // Info-Block (footer_text)
      if (quote.footer_text) {
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);
        doc.text('Info:', 50, y);
        y += 14;
        doc.font('Helvetica').fontSize(8).fillColor('#333333');
        doc.text(quote.footer_text, 50, y, { width: 495 });
        y = doc.y + 10;
      }

      // Footer
      doc.fontSize(7).fillColor('#999999');
      doc.text('Lies-Brunnenbau | www.lies-brunnenbau.de | info@lies-brunnenbau.de', 50, 780, { align: 'center', width: 495 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateQuotePdf };
