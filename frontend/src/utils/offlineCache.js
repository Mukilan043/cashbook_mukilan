import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

const KEY_INDEX = '__offline_cache_keys__';

async function addToIndex(key) {
  try {
    const list = (await idbGet(KEY_INDEX)) || [];
    if (!Array.isArray(list)) {
      await idbSet(KEY_INDEX, [key]);
      return;
    }
    if (!list.includes(key)) {
      list.push(key);
      await idbSet(KEY_INDEX, list);
    }
  } catch {
    // ignore
  }
}

export async function cacheSet(key, value) {
  await idbSet(key, value);
  await addToIndex(key);
}

export async function cacheGet(key) {
  return await idbGet(key);
}

export async function cacheDel(key) {
  await idbDel(key);
  try {
    const list = (await idbGet(KEY_INDEX)) || [];
    if (Array.isArray(list)) {
      const next = list.filter((k) => k !== key);
      await idbSet(KEY_INDEX, next);
    }
  } catch {
    // ignore
  }
}

export async function cacheDelByPrefix(prefix) {
  try {
    const list = (await idbGet(KEY_INDEX)) || [];
    if (!Array.isArray(list) || list.length === 0) return;

    const toDelete = list.filter((k) => typeof k === 'string' && k.startsWith(prefix));
    if (toDelete.length === 0) return;

    await Promise.all(toDelete.map((k) => idbDel(k)));
    const next = list.filter((k) => !toDelete.includes(k));
    await idbSet(KEY_INDEX, next);
  } catch {
    // ignore
  }
}

export async function withOfflineCache({
  key,
  fetcher,
  maxAgeMs = 1000 * 60 * 60 * 24 * 30, // 30 days
}) {
  try {
    const data = await fetcher();
    await cacheSet(key, { ts: Date.now(), data });
    return data;
  } catch (e) {
    const cached = await cacheGet(key);
    const ts = cached?.ts;
    const data = cached?.data;

    if (data !== undefined && (!ts || Date.now() - ts <= maxAgeMs)) {
      return data;
    }

    throw e;
  }
}
