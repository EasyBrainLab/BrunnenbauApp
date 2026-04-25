import { useState, useEffect } from 'react';
import { apiGet } from '../api';

// In-memory cache: listKey → { data, promise, timestamp }
const cache = {};

async function fetchList(listKey) {
  const res = await apiGet(`/api/value-lists/${listKey}/items`);
  if (!res.ok) throw new Error(`Failed to load value list: ${listKey}`);
  return res.json();
}

export function useValueList(listKey) {
  const [items, setItems] = useState(cache[listKey]?.data || []);
  const [loading, setLoading] = useState(!cache[listKey]?.data);

  useEffect(() => {
    if (!listKey) return;

    // Return cached data if fresh (5 min)
    if (cache[listKey]?.data && Date.now() - cache[listKey].timestamp < 300000) {
      setItems(cache[listKey].data);
      setLoading(false);
      return;
    }

    // Dedup: reuse in-flight promise
    if (!cache[listKey]?.promise) {
      const promise = fetchList(listKey).then((data) => {
        cache[listKey] = { data, promise: null, timestamp: Date.now() };
        return data;
      }).catch(() => {
        if (cache[listKey]) cache[listKey].promise = null;
        return cache[listKey]?.data || [];
      });
      cache[listKey] = { ...cache[listKey], promise };
    }

    cache[listKey].promise.then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, [listKey]);

  return { items, loading };
}

export function invalidateValueListCache(listKey) {
  if (listKey) {
    delete cache[listKey];
  } else {
    // Clear all
    for (const key of Object.keys(cache)) {
      delete cache[key];
    }
  }
}

// Helper: build a lookup map {value → label} from items
export function useValueListMap(listKey) {
  const { items, loading } = useValueList(listKey);
  const map = {};
  for (const item of items) {
    map[item.value] = item.label;
  }
  return { map, items, loading };
}
