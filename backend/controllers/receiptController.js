const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');

const OUTFLOW_KEYWORDS = ['total', 'amount paid', 'invoice', 'tax invoice', 'gst', 'vat', 'subtotal', 'grand total'];
const INFLOW_KEYWORDS = ['salary', 'refund', 'credited', 'credit', 'deposit', 'received'];
const TOTAL_KEYWORDS = ['total', 'amount paid', 'subtotal', 'grand total', 'balance', 'change', 'round off'];
const TAX_TOTAL_KEYWORDS = ['igst', 'cgst', 'sgst', 'gst', 'vat'];
const STATEMENT_KEYWORDS = ['credited', 'debited', 'upi', 'vpa', 'a/c', 'ac no', 'ref no', 'txn', 'transaction'];
const STATEMENT_STOPWORDS = [
  'rs', 'inr', 'credited', 'debited', 'credit', 'debit', 'to', 'from', 'on', 'by', 'a', 'ac', 'a/c',
  'account', 'linked', 'vpa', 'upi', 'ref', 'no', 'txn', 'transaction', 'bank', 'c'
];
const NOISE_KEYWORDS = [
  'phone', 'mobile', 'tel', 'fax', 'bill', 'date', 'time', 'invoice',
  'amount', 'paid', 'cash', 'card', 'thank',
  'address', 'store', 'shop', 'email', 'website', 'qty', 'discount'
];

function normalizeText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\t]+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}

function parseMoney(value) {
  const cleaned = String(value || '')
    .replace(/[,$]/g, '')
    .replace(/\s/g, '')
    .replace(/[^0-9.]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function cleanItemName(namePart) {
  const cleaned = String(namePart || '')
    .replace(/^[\s\d.xX]+/, '')
    .replace(/[\s\d]+$/, '')
    .replace(/[^a-zA-Z0-9\s&+\-]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned;
}

function findVpaUsername(line) {
  const vpaMatch = String(line || '').match(/\b([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+)\b/);
  if (vpaMatch) return vpaMatch[1];
  return '';
}

function cleanStatementName(line) {
  const vpaInline = findVpaUsername(line);
  if (vpaInline) {
    return vpaInline;
  }

  const lower = String(line || '').toLowerCase();
  const tokensRaw = String(line || '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const vpaIndex = tokensRaw.findIndex((token) => token.toLowerCase() === 'vpa');
  if (vpaIndex >= 0) {
    const candidate = tokensRaw[vpaIndex + 1];
    if (candidate && !STATEMENT_STOPWORDS.includes(candidate.toLowerCase())) {
      return candidate;
    }
  }

  const handleHosts = ['okaxis', 'okicici', 'oksbi', 'okhdfcbank', 'okhdfc', 'okbank', 'okyesbank'];
  const handleIndex = tokensRaw.findIndex((token) => handleHosts.includes(token.toLowerCase()));
  if (handleIndex > 0) {
    const candidate = tokensRaw[handleIndex - 1];
    if (candidate && !STATEMENT_STOPWORDS.includes(candidate.toLowerCase())) {
      return candidate;
    }
  }

  if (lower.includes('by')) {
    const byIndex = tokensRaw.findIndex((token) => token.toLowerCase() === 'by');
    if (byIndex >= 0) {
      const candidate = tokensRaw[byIndex + 1];
      if (candidate && !STATEMENT_STOPWORDS.includes(candidate.toLowerCase())) {
        return candidate;
      }
    }
  }

  const tokens = String(line || '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !STATEMENT_STOPWORDS.includes(token.toLowerCase()))
    .filter((token) => !/^\d{2,}$/.test(token));

  const cleaned = tokens.join(' ').trim();
  return cleaned || 'Bank transaction';
}

function looksLikeNoise(line, namePart, amount, numberCount) {
  const lower = line.toLowerCase();
  if (TOTAL_KEYWORDS.some((k) => lower.includes(k))) return true;
  if (TAX_TOTAL_KEYWORDS.some((k) => lower.includes(k))) return true;
  if (NOISE_KEYWORDS.some((k) => lower.includes(k))) return true;

  const letters = (namePart.match(/[a-zA-Z]/g) || []).length;
  const digits = (line.match(/[0-9]/g) || []).length;
  if (letters < 2) return true;
  if (numberCount === 1 && digits >= 8 && namePart.length < 6) return true;
  if (digits > letters * 2 && amount > 9999) return true;
  if (amount >= 1000000) return true;

  return false;
}

function extractItemsAndTotal(text) {
  const lines = normalizeText(text).split('\n').map((l) => l.trim()).filter(Boolean);
  const items = [];
  let total = null;
  let totalCandidates = [];
  const lowerText = String(text || '').toLowerCase();
  const statementMode = STATEMENT_KEYWORDS.some((k) => lowerText.includes(k));
  const amountLineIndices = [];

  if (statementMode) {
    for (let i = 0; i < lines.length; i += 1) {
      if (/(?:rs\.?|inr|₹)\s*[\d,]+(?:\.\d{1,2})?/i.test(lines[i])) {
        amountLineIndices.push(i);
      }
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lower = line.toLowerCase();

    if (TOTAL_KEYWORDS.some((k) => lower.includes(k)) || OUTFLOW_KEYWORDS.some((k) => lower.includes(k))) {
      const numMatch = line.match(/(\d+[\d,]*\.?\d{0,2})\s*$/);
      if (numMatch) {
        const val = parseMoney(numMatch[1]);
        if (val !== null) totalCandidates.push(val);
      }
      if (TOTAL_KEYWORDS.some((k) => lower.includes(k))) {
        continue;
      }
    }

    if (statementMode) {
      const currencyMatch = line.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
      if (!currencyMatch) continue;
      const amount = parseMoney(currencyMatch[1]);
      if (amount === null) continue;
      const lineLower = line.toLowerCase();
      let itemType = 'inflow';
      if (lineLower.includes('debited') || lineLower.includes('debit')) {
        itemType = 'outflow';
      } else if (lineLower.includes('credited') || lineLower.includes('credit')) {
        itemType = 'inflow';
      }
      const currentIndex = index;
      const currentPos = amountLineIndices.indexOf(currentIndex);
      const nextAmountIndex = currentPos >= 0 && currentPos < amountLineIndices.length - 1
        ? amountLineIndices[currentPos + 1]
        : lines.length;
      let localVpa = findVpaUsername(line);
      if (!localVpa) {
        for (let j = currentIndex + 1; j < nextAmountIndex; j += 1) {
          localVpa = findVpaUsername(lines[j]);
          if (localVpa) break;
        }
      }
      const name = localVpa || cleanStatementName(line.replace(currencyMatch[0], ' '));
      items.push({ name, amount, type: itemType });
      continue;
    }

    const numberTokens = line.match(/(\d+[\d,]*\.?\d{0,2})/g) || [];
    if (numberTokens.length === 0) continue;

    const amount = parseMoney(numberTokens[numberTokens.length - 1]);
    if (amount === null) continue;

    const namePart = line
      .replace(/(\d+[\d,]*\.?\d{0,2})/g, ' ')
      .replace(/[-:]/g, ' ')
      .trim();
    if (looksLikeNoise(line, namePart, amount, numberTokens.length)) continue;

    const name = cleanItemName(namePart);
    if (name) items.push({ name, amount });
  }

  if (totalCandidates.length > 0) {
    total = Math.max(...totalCandidates);
  }

  return { items, total };
}

function classifyReceipt(text) {
  const lower = String(text || '').toLowerCase();
  if (INFLOW_KEYWORDS.some((k) => lower.includes(k))) return 'inflow';
  if (OUTFLOW_KEYWORDS.some((k) => lower.includes(k))) return 'outflow';
  return 'outflow';
}

async function scanReceipt(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Receipt file is required' });
    }

    const debug = String(req.query?.debug || '') === '1';

    const { mimetype, buffer } = req.file;
    let rawText = '';

    if (mimetype === 'application/pdf') {
      const parsed = await pdfParse(buffer);
      rawText = parsed.text || '';
      if (!rawText.trim()) {
        return res.status(400).json({ error: 'Unable to extract text from PDF. Please upload a clear image.' });
      }
    } else if (mimetype.startsWith('image/')) {
      const result = await Tesseract.recognize(buffer, 'eng', {
        tessedit_pageseg_mode: 6,
      });
      rawText = result?.data?.text || '';
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Upload JPG, PNG, or PDF.' });
    }

    const { items, total } = extractItemsAndTotal(rawText);
    const type = classifyReceipt(rawText);

    if (!items.length && total === null) {
      return res.status(400).json({ error: 'No items found. Please enter details manually.' });
    }

    return res.json({
      type,
      items,
      total: total !== null ? Number(total.toFixed(2)) : null,
      rawText: debug ? rawText : undefined,
    });
  } catch (error) {
    console.error('Receipt scan failed:', error);
    return res.status(500).json({ error: 'Failed to scan receipt. Please try again.' });
  }
}

module.exports = { scanReceipt };
