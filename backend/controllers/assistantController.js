const { getDb } = require('../database/db');

function decodeCategoryFromDescription(value) {
  const raw = value || '';
  const match = raw.match(/^\s*\[#([^\]]+)\]\s*(.*)$/);
  if (!match) return { category: '', description: raw };
  return { category: (match[1] || '').trim(), description: (match[2] || '').trim() };
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function isoDateOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function clampDateRange(startDate, endDate, maxDays = 366) {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const today = new Date();
    const start30 = new Date(today);
    start30.setDate(start30.getDate() - 30);
    return { startDate: start30.toISOString().slice(0, 10), endDate: today.toISOString().slice(0, 10) };
  }

  let s = start;
  let e = end;
  if (s > e) {
    const tmp = s;
    s = e;
    e = tmp;
  }

  const diffMs = e.getTime() - s.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
  if (diffDays > maxDays) {
    const ns = new Date(e);
    ns.setDate(ns.getDate() - (maxDays - 1));
    s = ns;
  }

  return { startDate: s.toISOString().slice(0, 10), endDate: e.toISOString().slice(0, 10) };
}

async function openAIChat({ apiKey, model, messages, responseFormatJson = false }) {
  const url = 'https://api.openai.com/v1/chat/completions';

  const body = {
    model,
    messages,
    temperature: 0.2,
  };

  if (responseFormatJson) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`OpenAI error ${res.status}: ${text}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content : '';
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

async function listCashbooksForUser(db, userId) {
  return dbAll(db, 'SELECT id, name, description, created_at FROM cashbooks WHERE user_id = ? ORDER BY created_at DESC', [userId]);
}

async function getAllTimeBalance(db, { userId, cashbookId }) {
  return dbGet(
    db,
    `SELECT 
      COALESCE(SUM(CASE WHEN t.type = 'inflow' THEN t.amount ELSE 0 END), 0) as totalInflow,
      COALESCE(SUM(CASE WHEN t.type = 'outflow' THEN t.amount ELSE 0 END), 0) as totalOutflow,
      COALESCE(SUM(CASE WHEN t.type = 'inflow' THEN t.amount ELSE -t.amount END), 0) as balance
    FROM transactions t
    INNER JOIN cashbooks c ON t.cashbook_id = c.id
    WHERE t.cashbook_id = ? AND c.user_id = ?`,
    [cashbookId, userId]
  );
}

async function getTransactionsInRange(db, { userId, cashbookId, startDate, endDate }) {
  return dbAll(
    db,
    `SELECT t.* FROM transactions t
     INNER JOIN cashbooks c ON t.cashbook_id = c.id
     WHERE t.cashbook_id = ? AND c.user_id = ?
       AND t.date >= ? AND t.date <= ?
     ORDER BY t.date ASC, t.created_at ASC`,
    [cashbookId, userId, startDate, endDate]
  );
}

async function getRecentTransactions(db, { userId, cashbookId, limit = 5 }) {
  const lim = Math.max(1, Math.min(20, Number(limit) || 5));
  return dbAll(
    db,
    `SELECT t.* FROM transactions t
     INNER JOIN cashbooks c ON t.cashbook_id = c.id
     WHERE t.cashbook_id = ? AND c.user_id = ?
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT ${lim}`,
    [cashbookId, userId]
  );
}

function computeMetrics({ transactions, startDate, endDate }) {
  let inflow = 0;
  let outflow = 0;
  const byCategory = new Map();
  const byDate = new Map();

  for (const t of transactions) {
    const amount = Number(t.amount) || 0;
    if (t.type === 'inflow') inflow += amount;
    if (t.type === 'outflow') outflow += amount;

    const decoded = decodeCategoryFromDescription(t.description || '');
    const category = decoded.category || 'Uncategorized';
    if (!byCategory.has(category)) byCategory.set(category, { inflow: 0, outflow: 0 });
    const cat = byCategory.get(category);
    if (t.type === 'inflow') cat.inflow += amount;
    if (t.type === 'outflow') cat.outflow += amount;

    const d = t.date;
    if (!byDate.has(d)) byDate.set(d, { inflow: 0, outflow: 0 });
    const day = byDate.get(d);
    if (t.type === 'inflow') day.inflow += amount;
    if (t.type === 'outflow') day.outflow += amount;
  }

  const rangeDays = Math.max(
    1,
    Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000)) + 1
  );

  const categories = Array.from(byCategory.entries()).map(([name, v]) => ({
    name,
    inflow: Number(v.inflow.toFixed(2)),
    outflow: Number(v.outflow.toFixed(2)),
  }));

  categories.sort((a, b) => b.outflow - a.outflow);

  const daily = Array.from(byDate.entries())
    .map(([date, v]) => ({ date, inflow: Number(v.inflow.toFixed(2)), outflow: Number(v.outflow.toFixed(2)) }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return {
    startDate,
    endDate,
    rangeDays,
    totals: {
      inflow: Number(inflow.toFixed(2)),
      outflow: Number(outflow.toFixed(2)),
      net: Number((inflow - outflow).toFixed(2)),
    },
    categories,
    daily,
  };
}

function computeBudgetForecast({ outflow, rangeDays, monthDays, monthlyBudget }) {
  const avgDailyOutflow = rangeDays > 0 ? outflow / rangeDays : 0;
  const projectedMonthOutflow = avgDailyOutflow * monthDays;
  const budget = Number(monthlyBudget) || 0;
  const remaining = budget > 0 ? budget - projectedMonthOutflow : null;
  const status = budget > 0 ? (projectedMonthOutflow <= budget ? 'on_track' : 'over_budget') : 'no_budget';

  return {
    monthlyBudget: budget,
    avgDailyOutflow: Number(avgDailyOutflow.toFixed(2)),
    projectedMonthOutflow: Number(projectedMonthOutflow.toFixed(2)),
    remaining: remaining === null ? null : Number(remaining.toFixed(2)),
    status,
    monthDays,
  };
}

function monthDaysFromDate(endDate) {
  const d = new Date(endDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  return new Date(year, month + 1, 0).getDate();
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(iso, days) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function startOfMonthIso(iso) {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function endOfMonthIso(iso) {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function parseExplicitIsoDates(text) {
  const matches = String(text || '').match(/\b\d{4}-\d{2}-\d{2}\b/g);
  if (!matches || matches.length === 0) return { startDate: null, endDate: null };
  const startDate = isoDateOnly(matches[0]);
  const endDate = isoDateOnly(matches[1] || matches[0]);
  return { startDate, endDate };
}

function inferRangeFromText(text) {
  const t = String(text || '').toLowerCase();
  const today = getTodayIso();

  // explicit date overrides
  const explicit = parseExplicitIsoDates(t);
  if (explicit.startDate && explicit.endDate) {
    return clampDateRange(explicit.startDate, explicit.endDate, 366);
  }

  if (t.includes('today')) {
    return { startDate: today, endDate: today };
  }
  if (t.includes('yesterday')) {
    const y = addDaysIso(today, -1);
    return { startDate: y, endDate: y };
  }

  const lastNDays = t.match(/last\s+(\d{1,3})\s+days/);
  if (lastNDays) {
    const n = Math.max(1, Math.min(366, Number(lastNDays[1]) || 30));
    const start = addDaysIso(today, -(n - 1));
    return { startDate: start, endDate: today };
  }

  if (t.includes('last 7') || t.includes('past week') || t.includes('last week')) {
    return { startDate: addDaysIso(today, -6), endDate: today };
  }
  if (t.includes('last 30') || t.includes('past month')) {
    return { startDate: addDaysIso(today, -29), endDate: today };
  }
  if (t.includes('this month')) {
    return { startDate: startOfMonthIso(today), endDate: today };
  }
  if (t.includes('last month')) {
    const startThis = startOfMonthIso(today);
    const lastMonthEnd = addDaysIso(startThis, -1);
    return { startDate: startOfMonthIso(lastMonthEnd), endDate: endOfMonthIso(lastMonthEnd) };
  }

  // default
  return { startDate: addDaysIso(today, -29), endDate: today };
}

function findCashbooksMentioned(text, cashbooks) {
  const t = String(text || '').toLowerCase();
  const hits = [];
  for (const cb of cashbooks) {
    const name = String(cb.name || '').trim();
    if (!name) continue;
    if (t.includes(name.toLowerCase())) hits.push(cb);
  }
  return hits;
}

function money(n) {
  const v = Number(n || 0);
  return `Rs ${v.toFixed(2)}`;
}

function plainNumber(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return '0';
  if (Number.isInteger(v)) return String(v);
  // Round to 2 decimals, then strip trailing zeros.
  return String(Number(v.toFixed(2)));
}

function buildFallbackAnswer({ question, cashbooksUsed, blocks }) {
  // NOTE: This function is now only used as a generic fallback.
  // For user-friendly intent-based phrasing, see buildIntentAnswer().
  const lines = [];
  lines.push('Here is a quick summary from your cashbook data:');

  for (const b of blocks) {
    lines.push(`\nCashbook “${b.cashbook.name}”`);
    if (b.rangeSummary) {
      lines.push(
        `Range ${b.rangeSummary.startDate} → ${b.rangeSummary.endDate}: ` +
          `Inflow ${money(b.rangeSummary.totals.inflow)}, ` +
          `Outflow ${money(b.rangeSummary.totals.outflow)}, ` +
          `Net ${money(b.rangeSummary.totals.net)}`
      );
    }
  }

  return lines.join('\n');
}

function normalizeQuestionText(text) {
  let t = String(text || '').toLowerCase();
  // normalize common typos / shorthand
  t = t
    .replace(/\boutflw\b/g, 'outflow')
    .replace(/\boutflo\b/g, 'outflow')
    .replace(/\boutfloww\b/g, 'outflow')
    .replace(/\binflw\b/g, 'inflow')
    .replace(/\binflo\b/g, 'inflow')
    .replace(/\binfloww\b/g, 'inflow')
    .replace(/\btranscation\b/g, 'transaction')
    .replace(/\btranaction\b/g, 'transaction')
    .replace(/\btrnsaction\b/g, 'transaction');

  t = t.replace(/\bhlo\b/g, 'hello').replace(/\bhlw\b/g, 'hello').replace(/\bhii+\b/g, 'hi');

  return t;
}

function isGreetingQuestion(text) {
  const t = normalizeQuestionText(text).trim();
  return /^(hi|hello|hey|hlo|good\s+morning|good\s+afternoon|good\s+evening)(\b|\s|!|\?)$/i.test(t);
}

function isPhoneQuestion(text) {
  const t = normalizeQuestionText(text);
  return /\b(phone|mobile|contact)\b/.test(t) && /\b(number|no\b|no\.|num)\b/.test(t);
}

function isRegisteredPhoneQuestion(text) {
  const t = normalizeQuestionText(text);
  return /\b(registered|my|profile)\b/.test(t) && /\b(phone|mobile)\b/.test(t);
}

function isNameQuestion(text) {
  const t = normalizeQuestionText(text).trim();
  if (t === 'name' || t === 'my name' || t === 'username' || t === 'user name') return true;
  if (/\b(my\s+name|user\s*name|profile\s+name)\b/.test(t)) return true;
  return false;
}

async function getUserProfileById(db, userId) {
  return dbGet(db, 'SELECT id, username, email, mobile FROM users WHERE id = ?', [userId]);
}

function isCapabilitiesQuestion(text) {
  const t = normalizeQuestionText(text);
  return /\b(what\s+can\s+you\s+do|what\s+all\s+can\s+you\s+do|what\s+details|what\s+information|help|commands|examples)\b/i.test(t);
}

function isFullDetailsQuestion(text) {
  const t = normalizeQuestionText(text);
  return /\b(all\s+details|full\s+details|everything|complete\s+details|entire\s+cashbook|full\s+report|complete\s+report|summary\s+report)\b/i.test(t);
}

function buildCapabilitiesAnswer({ username }) {
  const namePart = username ? `${username}, ` : '';
  return (
    `${namePart}I can answer using your cashbook data (only what’s stored in this app). For example:\n` +
    `- balance / inflow / outflow (spent) / net\n` +
    `- last 7 days / this month / last month / custom dates (YYYY-MM-DD)\n` +
    `- top category / category breakdown\n` +
    `- recent transactions\n` +
    `- number of transactions\n` +
    `- budget forecast (if you set a monthly budget in the app)\n\n` +
    `Try: “mar full details”, “spent last 7 days in mar”, “top category this month”, “recent transactions for feb”.`
  );
}

function classifyIntent(question) {
  const q = normalizeQuestionText(question);

  const wantsBudget = /\bbudget\b|\bforecast\b|\bprediction\b|\bplan\b/i.test(q);
  const wantsRecent = /\brecent\b|\blast\s+transactions\b|\blatest\b|\bshow\s+last\b/i.test(q);
  const wantsTrend = /\btrend\b|\bdaily\b|\bgraph\b|\bchart\b|\bbar\b|\bline\b/i.test(q);
  const wantsCategory = /\bcategory\b|\btop\s+category\b|\bcategory\-wise\b|\bbreakdown\b/i.test(q);

  const asksBalance = /\bbalance\b|\bcurrent\s+balance\b|\bnet\s+balance\b/i.test(q);

  const asksInflow = /\binflow\b|\bincome\b|\breceived\b|\bcredit\b|\bdeposited\b/i.test(q);
  const asksOutflow = /\boutflow\b|\bexpense\b|\bspent\b|\bspend\b|\bdebit\b|\bpaid\b/i.test(q);
  const asksNet = /\bnet\b|\bprofit\b|\bsurplus\b|\bdeficit\b/i.test(q);

  const asksCount =
    /\b(how\s+many|count|number\s+of)\s+transaction(s)?\b/i.test(q) ||
    /\btransaction(s)?\s+count\b/i.test(q) ||
    /\btransaction(s)?\s+number\b/i.test(q) ||
    /\btotal\s+transaction(s)?\b/i.test(q);

  // If they say "spent", treat as outflow.
  let metric = 'summary';
  if (asksBalance) metric = 'balance';
  else if (asksNet) metric = 'net';
  else if (asksOutflow && !asksInflow) metric = 'outflow';
  else if (asksInflow && !asksOutflow) metric = 'inflow';
  else if (asksOutflow && asksInflow) metric = 'totals';

  // If they explicitly ask category/trend/budget/recent, answer those.
  if (isFullDetailsQuestion(q)) return { kind: 'full' };
  if (wantsRecent) return { kind: 'recent' };
  if (wantsBudget) return { kind: 'budget' };
  if (wantsCategory) return { kind: 'category', metric: asksInflow && !asksOutflow ? 'inflow' : 'outflow' };
  if (wantsTrend) return { kind: 'trend', metric: asksInflow && !asksOutflow ? 'inflow' : 'outflow' };

  if (asksCount) return { kind: 'count' };

  return { kind: 'metric', metric };
}

function formatRangeLabel(startDate, endDate, labelOverride = '') {
  if (labelOverride) return labelOverride;
  if (!startDate || !endDate) return '';
  if (startDate === endDate) return `on ${startDate}`;
  return `from ${startDate} to ${endDate}`;
}

function wantsNumberOnly(question, intent, multipleCashbooks) {
  if (multipleCashbooks) return false;
  if (!intent || !intent.kind) return false;
  const q = normalizeQuestionText(String(question || '').trim());
  if (!q) return false;

  if (/\b(answer\s*only|only\s*answer|just\s*answer)\b/.test(q)) return true;
  if (/\b(only|just)\b.*\b(number|amount|value)\b/.test(q)) return true;

  // Very short form like: "mar inflow??" or "outflow for feb".
  if (/^[a-z0-9_\-\s]{1,40}\s+(inflow|outflow|spent|spend|balance|net)\s*\?*$/i.test(q)) return true;
  if (/\b(inflow|outflow|spent|spend|balance|net)\b/.test(q) && q.split(/\s+/).length <= 5) return true;

  // Transaction count questions often want just a number.
  if (intent.kind === 'count' && q.split(/\s+/).length <= 6) return true;

  if (q.endsWith('??') && q.split(/\s+/).length <= 4) return true;

  return false;
}

function isEmailQuestion(text) {
  const t = normalizeQuestionText(text);
  if (!/\b(mail|email)\b/.test(t)) return false;
  // “mail id”, “email id”, “my email”, “email address”
  if (/\b(id|address)\b/.test(t)) return true;
  if (/\bmy\s+(mail|email)\b/.test(t)) return true;
  if (t.trim() === 'mail' || t.trim() === 'email') return true;
  return false;
}

function isAmbiguousNumberQuestion(text) {
  const t = normalizeQuestionText(text);
  // e.g. "number for mar" without specifying what number
  if (!/\bnumber\b/.test(t)) return false;
  // Avoid catching profile questions like "phone number".
  if (/\b(phone|mobile|contact)\b/.test(t)) return false;
  if (/\b(transaction|transactions|inflow|outflow|spent|balance|net|income|expense)\b/.test(t)) return false;
  return true;
}

async function getTransactionCountAllTime(db, { userId, cashbookId }) {
  const row = await dbGet(
    db,
    `SELECT COUNT(*) as cnt
     FROM transactions t
     INNER JOIN cashbooks c ON t.cashbook_id = c.id
     WHERE t.cashbook_id = ? AND c.user_id = ?`,
    [cashbookId, userId]
  );
  return Number(row?.cnt || 0);
}

function buildCountAnswer({ question, blocks, usedRange, usedDefaultRange }) {
  const intent = classifyIntent(question);
  const multi = blocks.length > 1;
  const numberOnly = wantsNumberOnly(question, intent, multi);

  const rangeLabel = formatRangeLabel(usedRange.startDate, usedRange.endDate, usedRange.label);
  const rangeSuffix = rangeLabel ? ` ${rangeLabel}` : '';
  const hint = usedDefaultRange
    ? ' (I used the last 30 days by default. Say “all time” or “this month” if you want.)'
    : '';

  if (!multi && numberOnly) {
    const c = Number(blocks?.[0]?.transactionCount || 0);
    return plainNumber(c);
  }

  const lines = [];
  for (const b of blocks) {
    const c = Number(b.transactionCount || 0);
    if (multi) lines.push(`In “${b.cashbook.name}”, you have ${c} transactions${rangeSuffix}.${hint}`);
    else lines.push(`You have ${c} transactions in “${b.cashbook.name}”${rangeSuffix}.${hint}`);
  }
  return lines.join('\n');
}

function buildFullDetailsAnswer({ blocks }) {
  const lines = [];
  lines.push('Here are the full details from your cashbook data:');

  for (const b of blocks) {
    lines.push(`\nCashbook “${b.cashbook.name}”`);

    if (b.allTimeBalance) {
      lines.push(
        `All time — Balance ${money(b.allTimeBalance.balance)} (Inflow ${money(b.allTimeBalance.totalInflow)}, Outflow ${money(b.allTimeBalance.totalOutflow)})`
      );
    }

    if (typeof b.transactionCountAllTime === 'number') {
      lines.push(`Transactions — ${b.transactionCountAllTime} total`);
    }

    if (b.last7Summary) {
      lines.push(
        `Last 7 days (${b.last7Summary.startDate} → ${b.last7Summary.endDate}) — Inflow ${money(b.last7Summary.totals.inflow)}, Outflow ${money(b.last7Summary.totals.outflow)}, Net ${money(b.last7Summary.totals.net)}`
      );
    }

    if (b.thisMonthSummary) {
      lines.push(
        `This month (${b.thisMonthSummary.startDate} → ${b.thisMonthSummary.endDate}) — Inflow ${money(b.thisMonthSummary.totals.inflow)}, Outflow ${money(b.thisMonthSummary.totals.outflow)}, Net ${money(b.thisMonthSummary.totals.net)}`
      );

      const cats = Array.isArray(b.thisMonthSummary.categories) ? b.thisMonthSummary.categories : [];
      if (cats.length > 0) {
        const top = [...cats].sort((a, c) => c.outflow - a.outflow)[0];
        if (top && top.outflow > 0) {
          lines.push(`Top category this month — ${top.name} (${money(top.outflow)})`);
        }
      }
    }

    if (b.budgetForecast && b.budgetForecast.monthlyBudget > 0) {
      const f = b.budgetForecast;
      const statusText = f.status === 'on_track' ? 'On track' : f.status === 'over_budget' ? 'Over budget' : 'No budget set';
      lines.push(
        `Budget — ${statusText}. Budget ${money(f.monthlyBudget)}, projected spend ${money(f.projectedMonthOutflow)}, remaining ${money(f.remaining)}`
      );
    }

    if (Array.isArray(b.recentTransactions) && b.recentTransactions.length > 0) {
      lines.push('Recent transactions:');
      for (const r of b.recentTransactions.slice(0, 5)) {
        const sign = r.type === 'inflow' ? '+' : '-';
        const cat = r.category ? ` (${r.category})` : '';
        const desc = r.description ? ` — ${r.description}` : '';
        lines.push(`${r.date}: ${sign}${money(r.amount)}${cat}${desc}`.trim());
      }
    } else {
      lines.push('Recent transactions: none');
    }
  }

  return lines.join('\n');
}

function buildIntentAnswer({ question, blocks, usedRange, usedDefaultRange }) {
  const intent = classifyIntent(question);
  const qLower = String(question || '').toLowerCase();

  const headerHint = usedDefaultRange
    ? ` (I used the last 30 days by default. Say “all time”, “this month”, or “last 7 days” if you want.)`
    : '';

  // If multiple cashbooks, keep it readable.
  const multi = blocks.length > 1;
  const numberOnly = wantsNumberOnly(question, intent, multi);
  const lines = [];

  if (intent.kind === 'count') {
    return buildCountAnswer({ question, blocks, usedRange, usedDefaultRange });
  }

  if (intent.kind === 'recent') {
    lines.push(multi ? 'Here are the latest transactions:' : 'Here are the latest transactions:');
    for (const b of blocks) {
      if (multi) lines.push(`\nCashbook “${b.cashbook.name}”:`);
      const rec = b.recentTransactions || [];
      if (rec.length === 0) {
        lines.push('No recent transactions found.');
        continue;
      }
      for (const r of rec.slice(0, 5)) {
        const sign = r.type === 'inflow' ? '+' : '-';
        const cat = r.category ? ` (${r.category})` : '';
        const desc = r.description ? ` — ${r.description}` : '';
        lines.push(`${r.date}: ${sign}${money(r.amount)} ${r.type}${cat}${desc}`.trim());
      }
    }
    return lines.join('\n');
  }

  if (intent.kind === 'budget') {
    lines.push('Budget forecast based on your recent spending:');
    for (const b of blocks) {
      const f = b.budgetForecast;
      if (!f) {
        lines.push(multi ? `\nCashbook “${b.cashbook.name}”: No budget data.` : 'No budget data.');
        continue;
      }
      const statusText = f.status === 'on_track' ? 'On track' : f.status === 'over_budget' ? 'Over budget' : 'No budget set';
      const base = `${statusText}: projected spending ${money(f.projectedMonthOutflow)} this month (avg/day ${money(f.avgDailyOutflow)})`;
      if (multi) lines.push(`\nCashbook “${b.cashbook.name}”: ${base}`);
      else lines.push(base);
      if (f.monthlyBudget > 0) {
        lines.push(`Budget: ${money(f.monthlyBudget)} • Remaining: ${money(f.remaining)}`);
      } else {
        lines.push('Set a monthly budget in the Report page to track it here.');
      }
    }
    return lines.join('\n');
  }

  if (intent.kind === 'category') {
    const metric = intent.metric === 'inflow' ? 'inflow' : 'outflow';
    const label = metric === 'inflow' ? 'inflow' : 'spending';
    lines.push(
      `Category breakdown for ${label} ${formatRangeLabel(usedRange.startDate, usedRange.endDate, usedRange.label)}:${headerHint}`
    );
    for (const b of blocks) {
      if (multi) lines.push(`\nCashbook “${b.cashbook.name}”:`);
      const cats = Array.isArray(b.rangeSummary?.categories) ? b.rangeSummary.categories : [];
      const sorted = [...cats].sort((a, c) => (metric === 'inflow' ? c.inflow - a.inflow : c.outflow - a.outflow));
      const top = sorted.filter((x) => (metric === 'inflow' ? x.inflow : x.outflow) > 0).slice(0, 5);
      if (top.length === 0) {
        lines.push('No category totals found in this range.');
        continue;
      }
      for (const c of top) {
        lines.push(`${c.name}: ${money(metric === 'inflow' ? c.inflow : c.outflow)}`);
      }
    }
    return lines.join('\n');
  }

  if (intent.kind === 'trend') {
    const metric = intent.metric === 'inflow' ? 'inflow' : 'outflow';
    lines.push(`Daily ${metric} trend ${formatRangeLabel(usedRange.startDate, usedRange.endDate, usedRange.label)}:${headerHint}`);
    for (const b of blocks) {
      if (multi) lines.push(`\nCashbook “${b.cashbook.name}”:`);
      const days = Array.isArray(b.rangeSummary?.daily) ? b.rangeSummary.daily : [];
      if (days.length === 0) {
        lines.push('No daily data in this range.');
        continue;
      }
      // Keep it short: show last 7 points
      const last = days.slice(-7);
      for (const d of last) {
        lines.push(`${d.date}: ${money(metric === 'inflow' ? d.inflow : d.outflow)}`);
      }
    }
    return lines.join('\n');
  }

  // metric intent
  const metric = intent.metric;
  if (metric === 'balance') {
    lines.push('Here’s your balance:');
    for (const b of blocks) {
      const bal = b.allTimeBalance;
      if (!bal) {
        lines.push(multi ? `\nCashbook “${b.cashbook.name}”: Balance not available.` : 'Balance not available.');
        continue;
      }
      const sentence = `Balance for “${b.cashbook.name}” is ${money(bal.balance)} (inflow ${money(bal.totalInflow)}, outflow ${money(bal.totalOutflow)}).`;
      lines.push(multi ? `\n${sentence}` : sentence);
    }
    return lines.join('\n');
  }

  const rangeLabel = formatRangeLabel(usedRange.startDate, usedRange.endDate, usedRange.label);
  const rangeSuffix = rangeLabel ? ` ${rangeLabel}` : '';
  const suffix = `${rangeSuffix}.${headerHint}`;

  const metricToLabel = (m) => {
    if (m === 'inflow') return 'total inflow';
    if (m === 'outflow') return 'total spending';
    if (m === 'net') return 'net amount';
    if (m === 'totals') return 'totals';
    return 'summary';
  };

  if (metric === 'inflow' || metric === 'outflow' || metric === 'net') {
    for (const b of blocks) {
      const totals = b.rangeSummary?.totals;
      if (!totals) continue;
      const value = metric === 'inflow' ? totals.inflow : metric === 'outflow' ? totals.outflow : totals.net;
      if (numberOnly) {
        return plainNumber(value);
      }
      const sentence = `In “${b.cashbook.name}”, your ${metricToLabel(metric)} is ${money(value)}${suffix}`;
      lines.push(sentence);
    }
    return lines.join('\n');
  }

  if (metric === 'totals') {
    for (const b of blocks) {
      const totals = b.rangeSummary?.totals;
      if (!totals) continue;
      lines.push(
        `In “${b.cashbook.name}”, inflow is ${money(totals.inflow)}, outflow is ${money(totals.outflow)}, net is ${money(totals.net)}${suffix}`
      );
    }
    return lines.join('\n');
  }

  // default
  return buildFallbackAnswer({ question, cashbooksUsed: [], blocks });
}

function isUsernameQuestion(text) {
  const t = String(text || '').toLowerCase();
  return /\b(username|user\s*name|my\s*name)\b/.test(t);
}

function isAskingAboutEnvNote(text) {
  const t = String(text || '').toLowerCase();
  if (!/\b(what\s+is\s+this|what\s+does\s+this\s+mean|why\s+is\s+this|explain)\b/.test(t)) return false;
  return /\b(openai|api\s*key|openai_api_key|\.env|backend\/\.env)\b/.test(t);
}

async function fallbackAssistant({ db, userId, username, email, question, currentCashbookId, budgetsByCashbook }) {
  const cashbooks = await listCashbooksForUser(db, userId);

  if (isGreetingQuestion(question)) {
    const namePart = username ? `${username}` : 'there';
    return `Hi ${namePart}! Ask me things like “mar inflow”, “spent last 7 days in mar”, or “mar full details”.`;
  }

  if (isNameQuestion(question) || isUsernameQuestion(question)) {
    if (username) return `Your username is ${username}.`;
    // Fallback to DB
    const profile = await getUserProfileById(db, userId);
    if (profile?.username) return `Your username is ${profile.username}.`;
    return 'I can’t see your username right now, but you can check it in Profile.';
  }

  if (isPhoneQuestion(question) || isRegisteredPhoneQuestion(question)) {
    const profile = await getUserProfileById(db, userId);
    if (profile?.mobile) return `Your registered phone number is ${profile.mobile}.`;
    return 'I can’t see your phone number right now, but you can check it in Profile.';
  }

  if (isEmailQuestion(question)) {
    if (email) return `Your email id is ${email}.`;
    return 'I can’t see your email right now, but you can check it in Profile.';
  }

  if (isAskingAboutEnvNote(question)) {
    const namePart = username ? `${username}, ` : '';
    return (
      `${namePart}that message is about enabling optional AI answers. ` +
      'If you add an OpenAI API key in backend/.env and restart the backend, the assistant can reply more like ChatGPT. ' +
      'Without it, I can still answer using your cashbook database (totals, spending, recent transactions, etc.).'
    );
  }

  if (isCapabilitiesQuestion(question)) {
    return buildCapabilitiesAnswer({ username });
  }

  if (cashbooks.length === 0) {
    return 'You have no cashbooks yet. Create one first, then ask me about totals, categories, or budgets.';
  }

  const raw = String(question || '');
  const t = normalizeQuestionText(raw);
  const mentioned = findCashbooksMentioned(t, cashbooks);

  if (isAmbiguousNumberQuestion(t)) {
    const namePart = username ? `${username}, ` : '';
    return (
      `${namePart}what number do you want for that cashbook — ` +
      'inflow, outflow (spent), balance, or number of transactions?' 
    );
  }

  let cashbookIds = [];
  if (/\ball\s+cashbooks\b|\boverall\b|\bacross\s+all\b/i.test(t)) {
    cashbookIds = cashbooks.map((c) => c.id);
  } else if (mentioned.length > 0) {
    cashbookIds = mentioned.map((c) => c.id);
  } else if (currentCashbookId) {
    const id = Number(currentCashbookId);
    if (cashbooks.some((c) => c.id === id)) cashbookIds = [id];
  } else if (cashbooks.length === 1) {
    cashbookIds = [cashbooks[0].id];
  } else {
    const names = cashbooks.slice(0, 10).map((c) => String(c.name || '').trim()).filter(Boolean);
    const choices = names.slice(0, 2).map((n) => `“${n}”`).join(' or ');
    const namePart = username ? `${username}, ` : '';
    if (choices) {
      return `${namePart}which cashbook do you mean — ${choices}?`;
    }
    return `${namePart}which cashbook do you mean? Tell me the cashbook name.`;
  }

  const hasExplicitRange = /\b(last\s+\d+\s+days|last\s+7|last\s+30|past\s+week|last\s+week|this\s+month|last\s+month|today|yesterday|\b\d{4}-\d{2}-\d{2}\b)\b/i.test(t);
  const range = inferRangeFromText(t);
  let usedDefaultRange = !hasExplicitRange;

  const intent = classifyIntent(t);
  const wantsFull = intent.kind === 'full';
  const wantsRecent = intent.kind === 'recent';
  const wantsBalance = intent.kind === 'metric' && intent.metric === 'balance';
  const wantsCategory = intent.kind === 'category';
  const wantsTrend = intent.kind === 'trend';
  const wantsBudget = intent.kind === 'budget';
  const wantsCount = intent.kind === 'count';

  // If user asks just "inflow/outflow/net" without a range, default to ALL-TIME.
  const metricAllTimeDefault =
    !hasExplicitRange &&
    intent.kind === 'metric' &&
    ['inflow', 'outflow', 'net', 'totals'].includes(intent.metric);

  const countAllTimeDefault = !hasExplicitRange && wantsCount;

  const effectiveRange = metricAllTimeDefault || countAllTimeDefault
    ? { startDate: null, endDate: null, label: 'all time' }
    : { startDate: range.startDate, endDate: range.endDate, label: '' };

  if (metricAllTimeDefault || countAllTimeDefault) {
    usedDefaultRange = false;
  }

  const blocks = [];
  const todayIso = getTodayIso();
  const last7Range = { startDate: addDaysIso(todayIso, -6), endDate: todayIso };
  const thisMonthRange = { startDate: startOfMonthIso(todayIso), endDate: todayIso };

  for (const cashbookId of cashbookIds) {
    const cb = cashbooks.find((c) => c.id === cashbookId);
    if (!cb) continue;

    const needAllTime = wantsFull || wantsBalance || metricAllTimeDefault;
    const needRecent = wantsFull || wantsRecent;
    const needCountAllTime = wantsFull || countAllTimeDefault;

    const allTimeBalance = needAllTime ? await getAllTimeBalance(db, { userId, cashbookId }) : null;
    const recent = needRecent ? await getRecentTransactions(db, { userId, cashbookId, limit: 5 }) : [];

    let transactionCount = null;
    if (needCountAllTime) {
      transactionCount = await getTransactionCountAllTime(db, { userId, cashbookId });
    }

    let metrics;
    if (metricAllTimeDefault) {
      const inflow = Number(allTimeBalance?.totalInflow || 0);
      const outflow = Number(allTimeBalance?.totalOutflow || 0);
      metrics = {
        startDate: null,
        endDate: null,
        rangeDays: 0,
        totals: {
          inflow: Number(inflow.toFixed(2)),
          outflow: Number(outflow.toFixed(2)),
          net: Number((inflow - outflow).toFixed(2)),
        },
        categories: [],
        daily: [],
      };
    } else if (countAllTimeDefault) {
      // Count-only all-time query: avoid range scans
      metrics = {
        startDate: null,
        endDate: null,
        rangeDays: 0,
        totals: { inflow: 0, outflow: 0, net: 0 },
        categories: [],
        daily: [],
      };
    } else {
      const tx = await getTransactionsInRange(db, { userId, cashbookId, startDate: range.startDate, endDate: range.endDate });
      if (wantsCount && !countAllTimeDefault) {
        transactionCount = tx.length;
      }
      metrics = computeMetrics({ transactions: tx, startDate: range.startDate, endDate: range.endDate });
    }

    // Only include extra datasets when explicitly asked
    const rangeSummary = {
      startDate: metrics.startDate,
      endDate: metrics.endDate,
      rangeDays: metrics.rangeDays,
      totals: metrics.totals,
      categories: wantsCategory ? metrics.categories : [],
      daily: wantsTrend ? metrics.daily : [],
    };

    const monthDays = monthDaysFromDate(range.endDate);
    const monthlyBudget = budgetsByCashbook && typeof budgetsByCashbook === 'object'
      ? Number(budgetsByCashbook[String(cashbookId)] || 0)
      : 0;
    const budgetForecast = (wantsBudget || wantsFull) && monthlyBudget > 0
      ? computeBudgetForecast({ outflow: metrics.totals.outflow, rangeDays: Math.max(1, metrics.rangeDays || 1), monthDays, monthlyBudget })
      : null;

    let last7Summary = null;
    let thisMonthSummary = null;
    if (wantsFull) {
      const tx7 = await getTransactionsInRange(db, { userId, cashbookId, startDate: last7Range.startDate, endDate: last7Range.endDate });
      last7Summary = computeMetrics({ transactions: tx7, startDate: last7Range.startDate, endDate: last7Range.endDate });

      const txM = await getTransactionsInRange(db, { userId, cashbookId, startDate: thisMonthRange.startDate, endDate: thisMonthRange.endDate });
      thisMonthSummary = computeMetrics({ transactions: txM, startDate: thisMonthRange.startDate, endDate: thisMonthRange.endDate });
    }

    blocks.push({
      cashbook: { id: cb.id, name: cb.name },
      allTimeBalance,
      transactionCount: wantsCount ? Number(transactionCount || 0) : null,
      transactionCountAllTime: wantsFull ? Number(transactionCount || 0) : null,
      last7Summary,
      thisMonthSummary,
      recentTransactions: recent.map((r) => {
        const decoded = decodeCategoryFromDescription(r.description || '');
        return {
          id: r.id,
          date: r.date,
          type: r.type,
          amount: Number(r.amount),
          category: decoded.category || '',
          description: decoded.description || '',
        };
      }),
      rangeSummary,
      budgetForecast,
    });
  }

  if (wantsFull) {
    return buildFullDetailsAnswer({ blocks });
  }

  return buildIntentAnswer({
    question,
    blocks,
    usedRange: {
      startDate: effectiveRange.startDate,
      endDate: effectiveRange.endDate,
      label: effectiveRange.label,
    },
    usedDefaultRange,
  });
}

function buildPlannerPrompt({ question, cashbooks, currentCashbookId }) {
  return [
    {
      role: 'system',
      content:
        'You are a planning assistant for a cashbook app. Return ONLY valid JSON. ' +
        'Decide which cashbook(s) the user refers to and what date range and metrics are needed. ' +
        'If user does not specify date range, use last 30 days for trends/categories and all-time for balance. ' +
        'Never include extra keys.\n\n' +
        'JSON schema:\n' +
        '{\n' +
        '  "cashbookIds": "all" | "current" | number[],\n' +
        '  "startDate": "YYYY-MM-DD" | null,\n' +
        '  "endDate": "YYYY-MM-DD" | null,\n' +
        '  "include": {\n' +
        '    "balance": boolean,\n' +
        '    "totals": boolean,\n' +
        '    "recent": number,\n' +
        '    "categoryBreakdown": boolean,\n' +
        '    "dailyTrend": boolean,\n' +
        '    "budgetForecast": boolean\n' +
        '  }\n' +
        '}',
    },
    {
      role: 'user',
      content: JSON.stringify({
        question,
        currentCashbookId: currentCashbookId || null,
        cashbooks: cashbooks.map((c) => ({ id: c.id, name: c.name })),
      }),
    },
  ];
}

function normalizePlan(planRaw, { cashbooks, currentCashbookId }) {
  const plan = planRaw && typeof planRaw === 'object' ? planRaw : {};
  const include = plan.include && typeof plan.include === 'object' ? plan.include : {};

  let cashbookIds = plan.cashbookIds;
  if (cashbookIds === 'all') {
    cashbookIds = cashbooks.map((c) => c.id);
  } else if (cashbookIds === 'current') {
    cashbookIds = currentCashbookId ? [Number(currentCashbookId)] : [];
  } else if (Array.isArray(cashbookIds)) {
    cashbookIds = cashbookIds.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  } else {
    cashbookIds = currentCashbookId ? [Number(currentCashbookId)] : cashbooks.slice(0, 1).map((c) => c.id);
  }

  const cashbookIdSet = new Set(cashbooks.map((c) => c.id));
  cashbookIds = cashbookIds.filter((id) => cashbookIdSet.has(id));
  if (cashbookIds.length === 0 && cashbooks.length > 0) cashbookIds = [cashbooks[0].id];

  const startDate = isoDateOnly(plan.startDate);
  const endDate = isoDateOnly(plan.endDate);

  const inc = {
    balance: include.balance !== false,
    totals: include.totals !== false,
    recent: Math.max(0, Math.min(10, Number(include.recent ?? 5) || 5)),
    categoryBreakdown: include.categoryBreakdown !== false,
    dailyTrend: include.dailyTrend !== false,
    budgetForecast: include.budgetForecast !== false,
  };

  return {
    cashbookIds,
    startDate,
    endDate,
    include: inc,
  };
}

async function chatWithAssistant(req, res) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const { message, currentCashbookId, budgetsByCashbook } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  const db = getDb();
  try {
    // Profile / small-talk answers that don't need AI.
    if (isGreetingQuestion(message)) {
      const namePart = req.user?.username || 'there';
      return res.json({
        answer: `Hi ${namePart}! Ask me things like “mar inflow”, “spent last 7 days in mar”, or “mar full details”.`,
      });
    }

    if (isNameQuestion(message) || isUsernameQuestion(message)) {
      return res.json({ answer: `Your username is ${req.user?.username || 'unknown'}.` });
    }

    if (isPhoneQuestion(message) || isRegisteredPhoneQuestion(message)) {
      const profile = await getUserProfileById(db, req.user.id);
      if (profile?.mobile) return res.json({ answer: `Your registered phone number is ${profile.mobile}.` });
      return res.json({ answer: 'I can’t see your phone number right now, but you can check it in Profile.' });
    }

    // Quick local answers that don't need AI or DB aggregation.
    if (isUsernameQuestion(message)) {
      return res.json({ answer: `Your username is ${req.user?.username || 'unknown'}.` });
    }

    if (isEmailQuestion(message)) {
      return res.json({ answer: `Your email id is ${req.user?.email || 'unknown'}.` });
    }

    if (!apiKey) {
      const answer = await fallbackAssistant({
        db,
        userId: req.user.id,
        username: req.user?.username,
        email: req.user?.email,
        question: message,
        currentCashbookId,
        budgetsByCashbook,
      });
      return res.json({ answer });
    }

    const cashbooks = await listCashbooksForUser(db, req.user.id);

    // 1) Plan
    const plannerMessages = buildPlannerPrompt({
      question: message,
      cashbooks,
      currentCashbookId,
    });

    const planText = await openAIChat({
      apiKey,
      model,
      messages: plannerMessages,
      responseFormatJson: true,
    });

    const planRaw = safeJsonParse(planText, null);
    const plan = normalizePlan(planRaw, { cashbooks, currentCashbookId });

    // 2) Compute data
    const now = new Date();
    const defaultEnd = now.toISOString().slice(0, 10);
    const defaultStart = (() => {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d.toISOString().slice(0, 10);
    })();

    const range = clampDateRange(plan.startDate || defaultStart, plan.endDate || defaultEnd, 366);

    const cashbookBlocks = [];
    for (const cashbookId of plan.cashbookIds) {
      const cb = cashbooks.find((c) => c.id === cashbookId);
      if (!cb) continue;

      const allTime = plan.include.balance ? await getAllTimeBalance(db, { userId: req.user.id, cashbookId }) : null;
      const recent = plan.include.recent > 0 ? await getRecentTransactions(db, { userId: req.user.id, cashbookId, limit: plan.include.recent }) : [];
      const tx = (plan.include.totals || plan.include.categoryBreakdown || plan.include.dailyTrend || plan.include.budgetForecast)
        ? await getTransactionsInRange(db, { userId: req.user.id, cashbookId, startDate: range.startDate, endDate: range.endDate })
        : [];

      const metrics = tx.length > 0 ? computeMetrics({ transactions: tx, startDate: range.startDate, endDate: range.endDate }) : {
        startDate: range.startDate,
        endDate: range.endDate,
        rangeDays: Math.max(1, Math.floor((new Date(range.endDate) - new Date(range.startDate)) / (24 * 60 * 60 * 1000)) + 1),
        totals: { inflow: 0, outflow: 0, net: 0 },
        categories: [],
        daily: [],
      };

      const monthDays = monthDaysFromDate(range.endDate);
      const monthlyBudget = budgetsByCashbook && typeof budgetsByCashbook === 'object'
        ? Number(budgetsByCashbook[String(cashbookId)] || 0)
        : 0;
      const forecast = plan.include.budgetForecast
        ? computeBudgetForecast({ outflow: metrics.totals.outflow, rangeDays: metrics.rangeDays, monthDays, monthlyBudget })
        : null;

      cashbookBlocks.push({
        cashbook: { id: cb.id, name: cb.name },
        allTimeBalance: allTime,
        recentTransactions: recent.map((r) => {
          const decoded = decodeCategoryFromDescription(r.description || '');
          return {
            id: r.id,
            date: r.date,
            type: r.type,
            amount: Number(r.amount),
            category: decoded.category || '',
            description: decoded.description || '',
          };
        }),
        rangeSummary: metrics,
        budgetForecast: forecast,
      });
    }

    // 3) Answer
    const responderMessages = [
      {
        role: 'system',
        content:
          'You are a helpful cashbook assistant. Answer ONLY using the provided data. ' +
          'If the user asks for something not available, say what you need (cashbook name, dates). ' +
          'Be concise and use simple bullet points when useful. Use INR formatting like Rs 123.45.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          question: message,
          plan,
          data: {
            dateRangeUsed: range,
            cashbooks: cashbookBlocks,
          },
        }),
      },
    ];

    try {
      const answer = await openAIChat({ apiKey, model, messages: responderMessages, responseFormatJson: false });
      return res.json({ answer });
    } catch (e) {
      // If OpenAI fails (rate limit/network), fall back to deterministic answer from DB
      const answer = await fallbackAssistant({
        db,
        userId: req.user.id,
        username: req.user?.username,
        email: req.user?.email,
        question: message,
        currentCashbookId,
        budgetsByCashbook,
      });
      return res.json({ answer });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Assistant failed' });
  }
}

module.exports = { chatWithAssistant };
