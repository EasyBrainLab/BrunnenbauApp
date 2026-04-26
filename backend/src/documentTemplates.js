const { dbAll, dbGet } = require('./database');

const DEFAULT_LAYOUT = {
  showIntro: true,
  showPostItemsText1: true,
  showPostItemsText2: true,
  showFooterText: true,
  showPaymentTerms: true,
  showPdfFooter: true,
  showBankDetails: true,
  showLegalFooter: true,
};

const TEMPLATE_PLACEHOLDERS = [
  { key: 'company_name', label: 'Firmenname' },
  { key: 'company_email', label: 'Firmen-E-Mail' },
  { key: 'company_phone', label: 'Firmen-Telefon' },
  { key: 'customer_name', label: 'Kundenname' },
  { key: 'customer_email', label: 'Kunden-E-Mail' },
  { key: 'inquiry_id', label: 'Anfrage-ID' },
  { key: 'well_type', label: 'Brunnenart (Schluessel)' },
  { key: 'well_type_label', label: 'Brunnenart (Anzeigename)' },
  { key: 'valid_until', label: 'Gueltig bis' },
  { key: 'quote_number', label: 'Angebotsnummer' },
  { key: 'quote_date', label: 'Angebotsdatum' },
  { key: 'net_total', label: 'Nettosumme' },
  { key: 'vat_total', label: 'MwSt.' },
  { key: 'gross_total', label: 'Bruttosumme' },
];

function normalizeTemplateLayout(layoutInput) {
  if (!layoutInput) return { ...DEFAULT_LAYOUT };

  let parsed = layoutInput;
  if (typeof layoutInput === 'string') {
    try {
      parsed = JSON.parse(layoutInput);
    } catch {
      parsed = {};
    }
  }

  return {
    ...DEFAULT_LAYOUT,
    ...(parsed && typeof parsed === 'object' ? parsed : {}),
  };
}

function renderTemplateText(template, context) {
  if (!template) return '';
  return String(template).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => context[key] ?? '');
}

function buildDocumentTemplateContext({ inquiry, wellType, companySettings, quoteTotals, quoteId }) {
  const now = new Date();
  const validityDays = parseInt(companySettings.quote_validity_days || '0', 10) || 0;
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + validityDays);

  const netTotal = Number(quoteTotals?.net || 0);
  const vatTotal = Number(quoteTotals?.vat ?? netTotal * 0.19);
  const grossTotal = Number(quoteTotals?.gross ?? netTotal + vatTotal);

  return {
    company_name: companySettings.company_name || '',
    company_email: companySettings.company_email || companySettings.email_from || '',
    company_phone: companySettings.company_phone || '',
    inquiry_id: inquiry?.inquiry_id || '',
    customer_name: `${inquiry?.first_name || ''} ${inquiry?.last_name || ''}`.trim() || 'Kunde',
    customer_email: inquiry?.email || '',
    well_type: wellType || '',
    well_type_label: wellType || '',
    valid_until: validityDays > 0 ? validUntil.toLocaleDateString('de-DE') : '',
    quote_number: quoteId ? `ANG-${quoteId}` : '',
    quote_date: now.toLocaleDateString('de-DE'),
    net_total: netTotal.toFixed(2),
    vat_total: vatTotal.toFixed(2),
    gross_total: grossTotal.toFixed(2),
  };
}

function buildFallbackTemplate(documentType, companySettings) {
  if (documentType === 'invoice') {
    return {
      id: null,
      document_type: 'invoice',
      name: 'Standardrechnung',
      description: 'Automatischer Rueckfall aus den Firmendaten.',
      is_active: 1,
      is_default: 1,
      sort_order: 0,
      document_title: companySettings.invoice_document_title || 'Rechnung',
      intro_text: companySettings.invoice_intro_text || '',
      post_items_text_1: companySettings.invoice_post_items_text_1 || '',
      post_items_text_2: companySettings.invoice_post_items_text_2 || '',
      footer_text: '',
      email_subject: 'Ihre Rechnung {{quote_number}}',
      email_body: 'Guten Tag {{customer_name}},\n\nanbei erhalten Sie Ihre Rechnung {{quote_number}}.\n\nMit freundlichen Gruessen\n{{company_name}}',
      layout_json: JSON.stringify(DEFAULT_LAYOUT),
    };
  }

  return {
    id: null,
    document_type: 'quote',
    name: 'Standardangebot',
    description: 'Automatischer Rueckfall aus den Firmendaten.',
    is_active: 1,
    is_default: 1,
    sort_order: 0,
    document_title: companySettings.quote_document_title || 'Kostenvoranschlag Brunnenbau',
    intro_text: companySettings.quote_intro_text || '',
    post_items_text_1: companySettings.quote_post_items_text_1 || '',
    post_items_text_2: companySettings.quote_post_items_text_2 || '',
    footer_text: '',
    email_subject: 'Ihr Angebot zur Anfrage {{inquiry_id}}',
    email_body: 'Sehr geehrte(r) {{customer_name}},\n\nanbei erhalten Sie unser Angebot zu Ihrer Anfrage {{inquiry_id}}.\n\nMit freundlichen Gruessen\n{{company_name}}',
    layout_json: JSON.stringify(DEFAULT_LAYOUT),
  };
}

async function getDocumentTemplatesAsync(tenantId, documentType = null) {
  const params = [tenantId || 'default'];
  let sql = `
    SELECT *
    FROM document_templates
    WHERE tenant_id = $1
  `;
  if (documentType) {
    params.push(documentType);
    sql += ` AND document_type = $${params.length}`;
  }
  sql += ' ORDER BY document_type, is_default DESC, sort_order, name';
  const rows = await dbAll(sql, params);
  return rows.map((row) => ({
    ...row,
    layout: normalizeTemplateLayout(row.layout_json),
  }));
}

async function getDocumentTemplateByIdAsync(id, tenantId) {
  const row = await dbGet('SELECT * FROM document_templates WHERE id = $1 AND tenant_id = $2', [id, tenantId || 'default']);
  if (!row) return null;
  return {
    ...row,
    layout: normalizeTemplateLayout(row.layout_json),
  };
}

async function getPreferredDocumentTemplateAsync({ tenantId, documentType, templateId, companySettings }) {
  const tid = tenantId || 'default';

  if (templateId) {
    const explicit = await dbGet(
      'SELECT * FROM document_templates WHERE id = $1 AND tenant_id = $2 AND document_type = $3',
      [templateId, tid, documentType]
    );
    if (explicit) {
      return {
        ...explicit,
        layout: normalizeTemplateLayout(explicit.layout_json),
      };
    }
  }

  const preferred = await dbGet(
    `SELECT *
     FROM document_templates
     WHERE tenant_id = $1 AND document_type = $2 AND is_active = 1
     ORDER BY is_default DESC, sort_order, id
     LIMIT 1`,
    [tid, documentType]
  );

  if (preferred) {
    return {
      ...preferred,
      layout: normalizeTemplateLayout(preferred.layout_json),
    };
  }

  const fallback = buildFallbackTemplate(documentType, companySettings);
  return {
    ...fallback,
    layout: normalizeTemplateLayout(fallback.layout_json),
  };
}

function resolveDocumentTemplate(template, context) {
  return {
    templateId: template.id || null,
    templateName: template.name,
    templateDescription: template.description || '',
    documentType: template.document_type,
    documentTitle: renderTemplateText(template.document_title, context),
    introText: renderTemplateText(template.intro_text, context),
    postItemsText1: renderTemplateText(template.post_items_text_1, context),
    postItemsText2: renderTemplateText(template.post_items_text_2, context),
    footerText: renderTemplateText(template.footer_text, context),
    emailSubject: renderTemplateText(template.email_subject, context),
    emailBody: renderTemplateText(template.email_body, context),
    layout: normalizeTemplateLayout(template.layout_json || template.layout),
  };
}

module.exports = {
  DEFAULT_LAYOUT,
  TEMPLATE_PLACEHOLDERS,
  normalizeTemplateLayout,
  renderTemplateText,
  buildDocumentTemplateContext,
  buildFallbackTemplate,
  getDocumentTemplatesAsync,
  getDocumentTemplateByIdAsync,
  getPreferredDocumentTemplateAsync,
  resolveDocumentTemplate,
};
