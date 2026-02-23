const MODEL_KEY = 'cb_category_model_v1';

export const DEFAULT_CATEGORIES = [
  '🍔 Food',
  '🚕 Transport',
  '🧾 Bills',
  '🛒 Shopping',
  '🎬 Entertainment',
  '🏥 Health',
  '📚 Education',
  '🎁 Gifts',
  '💼 Salary',
  '💰 Savings',
  '📦 Other',
];

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'to', 'for', 'of', 'in', 'on', 'at', 'with',
  'paid', 'pay', 'spent', 'spend', 'buy', 'bought', 'received', 'receive',
  'today', 'yesterday', 'tomorrow',
]);

const KEYWORD_RULES = [
  { category: '🍔 Food', keywords: ['food', 'lunch', 'dinner', 'breakfast', 'snack', 'cafe', 'coffee', 'restaurant', 'pizza', 'burger', 'swiggy', 'zomato'] },
  { category: '🚕 Transport', keywords: ['uber', 'ola', 'taxi', 'bus', 'train', 'metro', 'fuel', 'petrol', 'diesel', 'gas', 'parking', 'toll'] },
  { category: '🧾 Bills', keywords: ['rent', 'electric', 'electricity', 'water', 'wifi', 'internet', 'bill', 'recharge', 'phone', 'emi'] },
  { category: '🛒 Shopping', keywords: ['amazon', 'flipkart', 'shopping', 'shop', 'clothes', 'dress', 'shoes', 'grocery', 'groceries', 'store'] },
  { category: '🎬 Entertainment', keywords: ['movie', 'cinema', 'netflix', 'prime', 'hotstar', 'spotify', 'game', 'concert'] },
  { category: '🏥 Health', keywords: ['doctor', 'hospital', 'medicine', 'pharmacy', 'clinic', 'gym', 'fitness'] },
  { category: '📚 Education', keywords: ['course', 'class', 'tuition', 'book', 'udemy', 'coursera', 'college', 'school'] },
  { category: '🎁 Gifts', keywords: ['gift', 'present'] },
  { category: '💼 Salary', keywords: ['salary', 'paycheck', 'wage', 'stipend'] },
  { category: '💰 Savings', keywords: ['saving', 'savings', 'deposit', 'investment', 'sip', 'mutual'] },
];

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeCategory(category) {
  if (!category) return '';
  return String(category).replace(/[\]\n\r]/g, '').trim();
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map(t => t.trim())
    .filter(Boolean)
    .filter(t => !STOPWORDS.has(t));
}

function loadModel() {
  if (typeof window === 'undefined') return {};
  return safeJsonParse(localStorage.getItem(MODEL_KEY), {});
}

function saveModel(model) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MODEL_KEY, JSON.stringify(model));
}

export function decodeDescription(storedDescription) {
  const raw = storedDescription || '';
  const match = raw.match(/^\s*\[#([^\]]+)\]\s*(.*)$/);
  if (!match) {
    return { category: '', description: raw };
  }
  return {
    category: normalizeCategory(match[1]),
    description: match[2] || '',
  };
}

export function encodeDescription({ description, category }) {
  const cleanDesc = String(description || '').trim();
  const cleanCat = normalizeCategory(category);
  if (!cleanCat) return cleanDesc;
  return `[#${cleanCat}] ${cleanDesc}`.trim();
}

export function learnCategory({ description, category }) {
  const cleanCat = normalizeCategory(category);
  if (!cleanCat) return;

  const tokens = tokenize(description);
  if (tokens.length === 0) return;

  const model = loadModel();
  for (const token of tokens) {
    const entry = model[token] || { category: cleanCat, count: 0 };
    if (entry.category !== cleanCat) {
      // Simple reconciliation: keep the more frequent association.
      entry.count = Math.max(0, entry.count - 1);
      if (entry.count === 0) entry.category = cleanCat;
    }
    entry.count += 1;
    model[token] = entry;
  }
  saveModel(model);
}

export function inferCategory(description) {
  const text = String(description || '').toLowerCase();

  // 1) Explicit prefix wins.
  const decoded = decodeDescription(description);
  if (decoded.category) return decoded.category;

  // 2) Rule-based keywords.
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some(k => text.includes(k))) return rule.category;
  }

  // 3) Learned model.
  const tokens = tokenize(text);
  const model = loadModel();

  let best = { category: '', score: 0 };
  for (const token of tokens) {
    const entry = model[token];
    if (!entry) continue;
    if (entry.count > best.score) best = { category: entry.category, score: entry.count };
  }

  return best.category || '';
}

export function parseNaturalInput(input) {
  const text = String(input || '').trim();
  if (!text) return { amount: '', date: '', description: '' };

  const now = new Date();
  let date = '';

  // Date detection
  const iso = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) {
    date = iso[1];
  } else if (/\btoday\b/i.test(text)) {
    date = now.toISOString().slice(0, 10);
  } else if (/\byesterday\b/i.test(text)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    date = d.toISOString().slice(0, 10);
  }

  // Amount detection (first number)
  const amountMatch = text.match(/(?:₹|rs\.?|inr|\$)?\s*(\d+(?:\.\d{1,2})?)/i);
  const amount = amountMatch ? amountMatch[1] : '';

  // Description heuristic
  let desc = text;
  if (iso) desc = desc.replace(iso[1], ' ');
  if (amountMatch) desc = desc.replace(amountMatch[0], ' ');
  desc = desc
    .replace(/\b(today|yesterday|tomorrow)\b/gi, ' ')
    .replace(/\b(paid|spent|pay|spend|received|receive)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Prefer phrase after "for"
  const forMatch = desc.match(/\bfor\s+(.+)$/i);
  if (forMatch?.[1]) desc = forMatch[1].trim();

  return { amount, date, description: desc };
}
